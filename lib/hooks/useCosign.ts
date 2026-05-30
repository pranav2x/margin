import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { recordActivity } from './useStreak';
import type { MetricRow } from './usePlayerProfile';

// Mirrors the column list used by usePlayerProfile so the embedded metric shape
// matches MetricRow exactly.
const METRIC_COLUMNS =
  'id, sport, key, label, unit, direction, sort_order, min_13_15, max_13_15, min_16_18, max_16_18, min_19_plus, max_19_plus';

// A mark surfaced on the confirm screen (opened from a share invite).
export interface ConfirmStat {
  id: string;
  value: number;
  verified: boolean;
  is_plausible: boolean | null;
  owner_id: string;
  owner_handle: string | null;
  owner_school_id: string | null;
  metric: MetricRow;
}

interface RawConfirmRow {
  id: string;
  value: number;
  verified: boolean;
  is_plausible: boolean | null;
  owner: { id: string; handle: string | null; school_id: string | null } | null;
  metric: MetricRow;
}

// Loads a single mark by id for the confirm screen. Block-aware via RLS — returns
// null if the mark (or its owner) isn't visible to the viewer.
export function useConfirmStat(statId: string | undefined) {
  return useQuery({
    queryKey: ['confirm-stat', statId],
    enabled: !!statId,
    queryFn: async (): Promise<ConfirmStat | null> => {
      const { data, error } = await supabase
        .from('player_stats')
        .select(
          `id, value, verified, is_plausible, owner:profiles!inner(id, handle, school_id), metric:sport_metrics(${METRIC_COLUMNS})`,
        )
        .eq('id', statId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as unknown as RawConfirmRow; // PostgREST embeds typed as relation arrays here; explicit shape is clearer.
      return {
        id: row.id,
        value: row.value,
        verified: row.verified,
        is_plausible: row.is_plausible,
        owner_id: row.owner?.id ?? '',
        owner_handle: row.owner?.handle ?? null,
        owner_school_id: row.owner?.school_id ?? null,
        metric: row.metric,
      };
    },
  });
}

// A same-school mark awaiting co-sign, for the "Confirm at your school" feed.
export interface UnconfirmedStat {
  id: string;
  value: number;
  owner_id: string;
  owner_handle: string | null;
  metric: MetricRow;
}

interface RawPeer {
  id: string;
  handle: string | null;
}
interface RawUnconfirmedStat {
  id: string;
  profile_id: string;
  value: number;
  metric: MetricRow;
}

// Same-school marks that are plausible, not yet verified, and not yet co-signed
// by the viewer. Three small reads joined client-side (the untyped client makes
// embedded-resource filters brittle, so we keep each query simple + explicit).
export function useSchoolUnconfirmed(schoolId: string | null | undefined, selfId: string | undefined) {
  return useQuery({
    queryKey: ['school-unconfirmed', schoolId ?? null, selfId ?? null],
    enabled: !!schoolId && !!selfId,
    queryFn: async (): Promise<UnconfirmedStat[]> => {
      const { data: peers, error: peersError } = await supabase
        .from('profiles')
        .select('id, handle')
        .eq('school_id', schoolId!)
        .neq('id', selfId!)
        .limit(200);
      if (peersError) throw peersError;
      const peerList = (peers as RawPeer[] | null) ?? [];
      if (peerList.length === 0) return [];
      const handleById = new Map(peerList.map((p) => [p.id, p.handle]));
      const peerIds = peerList.map((p) => p.id);

      const { data: stats, error: statsError } = await supabase
        .from('player_stats')
        .select(`id, profile_id, value, metric:sport_metrics(${METRIC_COLUMNS})`)
        .in('profile_id', peerIds)
        .eq('verified', false)
        .eq('is_plausible', true)
        .limit(200);
      if (statsError) throw statsError;
      const statList = (stats as unknown as RawUnconfirmedStat[]) ?? [];
      if (statList.length === 0) return [];

      const { data: mine, error: mineError } = await supabase
        .from('stat_cosigns')
        .select('stat_id')
        .eq('cosigner_id', selfId!);
      if (mineError) throw mineError;
      const alreadyCosigned = new Set(
        ((mine as { stat_id: string }[] | null) ?? []).map((c) => c.stat_id),
      );

      return statList
        .filter((s) => !alreadyCosigned.has(s.id))
        .map((s) => ({
          id: s.id,
          value: s.value,
          owner_id: s.profile_id,
          owner_handle: handleById.get(s.profile_id) ?? null,
          metric: s.metric,
        }));
    },
  });
}

// Co-sign a same-school peer's mark. The server (cosign_stat) is the source of
// truth: it enforces same-school / no-self and is the only writer of `verified`.
export function useCosignStat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statId: string): Promise<void> => {
      const { error } = await supabase.rpc('cosign_stat', { p_stat_id: statId });
      if (error) throw error;
    },
    onSuccess: (_data, statId) => {
      queryClient.invalidateQueries({ queryKey: ['confirm-stat', statId] });
      queryClient.invalidateQueries({ queryKey: ['school-unconfirmed'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['public-stats'] });
      queryClient.invalidateQueries({ queryKey: ['my-stats'] });
      // Co-signing a teammate is a core-loop action — advance the streak.
      void recordActivity(queryClient);
    },
  });
}
