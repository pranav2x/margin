import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import type { Take, Sport } from '../../types';

const TAKES_KEY = ['takes'] as const;

interface DbTake {
  id: string;
  user_id: string;
  body: string;
  topic: string | null;
  created_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    handle: string | null;
    avatar_url: string | null;
    following_sports: string[];
  };
}

interface DbReaction {
  take_id: string;
  user_id: string;
  reaction: 'respond' | 'cosign' | 'dispute';
}

export function useTakes() {
  return useQuery({
    queryKey: TAKES_KEY,
    queryFn: async (): Promise<Take[]> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch takes with author profile
      const { data: takesData, error: takesErr } = await supabase
        .from('takes')
        .select('*, profiles!takes_user_id_fkey(id, display_name, handle, avatar_url, following_sports)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (takesErr) throw takesErr;

      if (!takesData || takesData.length === 0) return [];

      const takeIds = takesData.map((t) => t.id);

      // Fetch all reactions for these takes
      const { data: reactionsData } = await supabase
        .from('take_reactions')
        .select('take_id, user_id, reaction')
        .in('take_id', takeIds);

      const reactions = (reactionsData ?? []) as DbReaction[];

      return takesData.map((t) => {
        const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
        const takeReactions = reactions.filter((r) => r.take_id === t.id);

        const counts = { respond: 0, cosign: 0, dispute: 0 };
        let myReaction: 'respond' | 'cosign' | 'dispute' | undefined;

        for (const r of takeReactions) {
          counts[r.reaction]++;
          if (user && r.user_id === user.id) myReaction = r.reaction;
        }

        return {
          id: t.id,
          author: {
            id: profile?.id ?? t.user_id,
            handle: profile?.handle ?? 'anon',
            displayName: profile?.display_name ?? 'Anonymous',
            avatar: profile?.avatar_url ?? '',
            followingAthletes: [],
            followingSports: (profile?.following_sports ?? []) as Sport[],
          },
          body: t.body,
          createdAt: t.created_at,
          counts,
          myReaction,
          topic: (t.topic as Sport) ?? undefined,
        } satisfies Take;
      });
    },
  });
}

export function usePostTake() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ body, topic }: { body: string; topic?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('takes')
        .insert({ user_id: user.id, body, topic: topic ?? null });

      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TAKES_KEY });
    },
  });
}

export function useReactToTake() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      takeId,
      reaction,
      currentReaction,
    }: {
      takeId: string;
      reaction: 'respond' | 'cosign' | 'dispute';
      currentReaction?: 'respond' | 'cosign' | 'dispute';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (currentReaction === reaction) {
        // Toggle off — remove the reaction
        const { error } = await supabase
          .from('take_reactions')
          .delete()
          .eq('take_id', takeId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Upsert the reaction
        const { error } = await supabase
          .from('take_reactions')
          .upsert(
            { take_id: takeId, user_id: user.id, reaction },
            { onConflict: 'take_id,user_id' },
          );
        if (error) throw error;
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TAKES_KEY });
    },
  });
}
