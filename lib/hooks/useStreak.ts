import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

// Shared react-query key for the viewer's streak. Read by useStreak and
// invalidated after each recorded activity so the flame refreshes in place.
export const STREAK_QUERY_KEY = ['streak'] as const;

// Advance the daily-return streak after a real core-loop action — saving a
// stat, co-signing a teammate, or filing a battle. Fire-and-forget by
// contract: it NEVER throws, so a streak hiccup can't break the action that
// triggered it, and there is no failure-moment surface. On success it refreshes
// the streak read; the server (record_activity) is the sole source of truth.
export async function recordActivity(queryClient: QueryClient): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_activity');
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: STREAK_QUERY_KEY });
    }
  } catch {
    // Swallowed on purpose — streaks stay humane; nothing scary at the moment.
  }
}
