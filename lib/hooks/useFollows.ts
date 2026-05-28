import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useUserStore } from '../../state/user';

const FOLLOWS_KEY = ['follows'] as const;

export function useFollows() {
  return useQuery({
    queryKey: FOLLOWS_KEY,
    queryFn: async (): Promise<string[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('follows')
        .select('athlete_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const ids = (data ?? []).map((r) => r.athlete_id);

      // Rehydrate Zustand store
      useUserStore.setState({ followingAthletes: ids });

      return ids;
    },
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ athleteId, following }: { athleteId: string; following: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (following) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('athlete_id', athleteId);
        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({ user_id: user.id, athlete_id: athleteId });
        if (error) throw error;
      }
    },
    onMutate: async ({ athleteId, following }) => {
      // Optimistic update on the Zustand store
      const store = useUserStore.getState();
      if (following) store.unfollow(athleteId);
      else store.follow(athleteId);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FOLLOWS_KEY });
    },
  });
}
