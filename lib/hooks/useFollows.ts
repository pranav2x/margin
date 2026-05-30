import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useIsFollowing(targetId: string | undefined) {
  return useQuery({
    queryKey: ['is-following', targetId],
    enabled: !!targetId,
    queryFn: async (): Promise<boolean> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      if (user.id === targetId) return false;
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('following_id', targetId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export function useFollowCounts(targetId: string | undefined) {
  return useQuery({
    queryKey: ['follow-counts', targetId],
    enabled: !!targetId,
    queryFn: async (): Promise<FollowCounts> => {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetId!),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', targetId!),
      ]);
      if (followersRes.error) throw followersRes.error;
      if (followingRes.error) throw followingRes.error;
      return {
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
      };
    },
  });
}

export function useToggleFollow(targetId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (currentlyFollowing: boolean): Promise<void> => {
      if (!targetId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (user.id === targetId) return;
      if (currentlyFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: targetId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', targetId] });
      queryClient.invalidateQueries({ queryKey: ['follow-counts', targetId] });
    },
  });
}
