import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { useUserStore } from '../../state/user';
import { usePreferencesStore } from '../../state/preferences';
import type { Sport } from '../../types';

export interface Profile {
  id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  grad_year: number | null;
  school: string | null;
  edition_streak: number;
  streak_freezes_remaining: number;
  following_sports: string[];
  theme_preference: 'system' | 'light' | 'dark';
  comments_enabled: boolean;
  cross_school_dms_enabled: boolean;
  is_minor: boolean;
  onboarded: boolean;
}

const PROFILE_KEY = ['profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async (): Promise<Profile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Rehydrate Zustand stores from server state
      if (data) {
        const userStore = useUserStore.getState();
        userStore.setProfile({
          handle: data.handle ?? 'you',
          displayName: data.display_name ?? 'Your Name',
        });
        useUserStore.setState({
          avatar: data.avatar_url ?? userStore.avatar,
          followingSports: (data.following_sports ?? []) as Sport[],
          editionStreak: data.edition_streak,
          streakFreezesRemaining: data.streak_freezes_remaining,
          gradYear: data.grad_year ?? userStore.gradYear,
          school: data.school ?? userStore.school,
        });

        const prefsStore = usePreferencesStore.getState();
        prefsStore.setThemePreference(data.theme_preference);
        prefsStore.setCommentsEnabled(data.comments_enabled);
        prefsStore.setCrossSchoolDmsEnabled(data.cross_school_dms_enabled);
        prefsStore.setIsMinor(data.is_minor);
      }

      return data as Profile;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<Profile, 'id'>>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
}
