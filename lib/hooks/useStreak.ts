import { useQuery, type QueryClient } from '@tanstack/react-query';
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

export type StreakDayState = 'active' | 'frozen' | 'missed';

export interface StreakDay {
  day: string; // UTC calendar date, yyyy-mm-dd
  state: StreakDayState;
  isToday: boolean;
  label: string; // single-letter weekday initial (UTC)
}

export interface StreakData {
  current: number;
  longest: number;
  freezes: number;
  days: StreakDay[]; // exactly 7, oldest → newest (today last)
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The last 7 UTC calendar dates, oldest → newest. Matches record_activity's day
// definition ((now() at time zone 'utc')::date) so the strip lines up exactly
// with the server's ledger regardless of the device's local time zone.
function last7UtcDays(now: Date): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Reads the viewer's streak row plus the last 7 days of the activity ledger and
// shapes them for the You-tab flame + 7-day strip. Returns null when signed out.
export function useStreak() {
  return useQuery({
    queryKey: STREAK_QUERY_KEY,
    queryFn: async (): Promise<StreakData | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const window = last7UtcDays(new Date());
      const [streakRes, daysRes] = await Promise.all([
        supabase
          .from('streaks')
          .select('current_len, longest_len, freezes')
          .eq('profile_id', user.id)
          .maybeSingle(),
        supabase
          .from('activity_days')
          .select('day, frozen')
          .eq('profile_id', user.id)
          .gte('day', window[0]),
      ]);
      if (streakRes.error) throw streakRes.error;
      if (daysRes.error) throw daysRes.error;

      const streak = streakRes.data as
        | { current_len: number; longest_len: number; freezes: number }
        | null;

      // day → frozen flag for the rows inside the window.
      const frozenByDay = new Map<string, boolean>();
      for (const row of (daysRes.data as { day: string; frozen: boolean }[] | null) ?? []) {
        frozenByDay.set(row.day, row.frozen);
      }

      const today = window[window.length - 1];
      const days: StreakDay[] = window.map((day) => {
        const logged = frozenByDay.has(day);
        const state: StreakDayState = logged
          ? frozenByDay.get(day)
            ? 'frozen'
            : 'active'
          : 'missed';
        const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
        return { day, state, isToday: day === today, label: WEEKDAY_INITIALS[weekday] };
      });

      return {
        current: streak?.current_len ?? 0,
        longest: streak?.longest_len ?? 0,
        freezes: streak?.freezes ?? 0,
        days,
      };
    },
  });
}
