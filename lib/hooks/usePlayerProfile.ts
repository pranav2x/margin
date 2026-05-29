import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export const SPORTS = ['football', 'basketball', 'baseball', 'track'] as const;
export type Sport = (typeof SPORTS)[number];
export type AgeBand = '13_15' | '16_18' | '19_plus';

export const SPORT_LABELS: Record<Sport, string> = {
  football: 'Football',
  basketball: 'Basketball',
  baseball: 'Baseball',
  track: 'Track',
};

export interface MetricRow {
  id: string;
  sport: string;
  key: string;
  label: string;
  unit: string | null;
  direction: 'higher_better' | 'lower_better';
  sort_order: number;
  min_13_15: number | null;
  max_13_15: number | null;
  min_16_18: number | null;
  max_16_18: number | null;
  min_19_plus: number | null;
  max_19_plus: number | null;
}

export interface PlayerStat {
  id: string;
  value: number;
  verified: boolean;
  verification_method: string;
  is_plausible: boolean | null;
  notes: string | null;
  metric: MetricRow;
}

export interface MyProfile {
  id: string;
  handle: string | null;
  display_name: string | null;
  grad_year: number | null;
  primary_sport: string | null;
  age_band: AgeBand | null;
  avatar_url: string | null;
  school: { name: string; city: string | null; state: string | null } | null;
}

const METRIC_COLUMNS =
  'id, sport, key, label, unit, direction, sort_order, min_13_15, max_13_15, min_16_18, max_16_18, min_19_plus, max_19_plus';

export function boundsForBand(
  metric: MetricRow,
  band: AgeBand | null,
): { min: number | null; max: number | null } {
  if (band === '13_15') return { min: metric.min_13_15, max: metric.max_13_15 };
  if (band === '16_18') return { min: metric.min_16_18, max: metric.max_16_18 };
  return { min: metric.min_19_plus, max: metric.max_19_plus };
}

export function isValuePlausible(
  value: number,
  metric: MetricRow,
  band: AgeBand | null,
): boolean {
  const { min, max } = boundsForBand(metric, band);
  return (min == null || value >= min) && (max == null || value <= max);
}

// Format a numeric stat for display. Keeps tabular feel; trims noise.
export function formatStatValue(value: number, unit: string | null): string {
  if (unit === 'AVG') return value.toFixed(3).replace(/^0/, '');
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: async (): Promise<MyProfile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name, grad_year, primary_sport, age_band, avatar_url, school:schools(name, city, state)')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MyProfile) ?? null;
    },
  });
}

export function useMyStats() {
  return useQuery({
    queryKey: ['my-stats'],
    queryFn: async (): Promise<PlayerStat[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('player_stats')
        .select(`id, value, verified, verification_method, is_plausible, notes, metric:sport_metrics(${METRIC_COLUMNS})`)
        .eq('profile_id', user.id);
      if (error) throw error;
      return (data as unknown as PlayerStat[]) ?? [];
    },
  });
}

export function useMetricCatalog() {
  return useQuery({
    queryKey: ['metric-catalog'],
    staleTime: 1000 * 60 * 60,
    queryFn: async (): Promise<MetricRow[]> => {
      const { data, error } = await supabase
        .from('sport_metrics')
        .select(METRIC_COLUMNS)
        .order('sport')
        .order('sort_order');
      if (error) throw error;
      return (data as unknown as MetricRow[]) ?? [];
    },
  });
}
