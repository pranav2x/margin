import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Segmented } from '../../components/primitives/Segmented';
import { FilterChip } from '../../components/primitives/FilterChip';
import { Skeleton } from '../../components/primitives/Skeleton';
import {
  LeaderboardRow,
  type LeaderboardRowData,
} from '../../components/composite/LeaderboardRow';
import { tierOf } from '../../components/primitives/VerifiedBadge';
import { EmptyState } from '../../components/composite/EmptyState';
import { supabase } from '../../lib/supabase';
import {
  SPORT_LABELS,
  formatStatValue,
  useMetricCatalog,
  useMyProfile,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';
import { DEMO_FORTY_BOARD, DEMO_METRICS } from '../../data/fixtures/demoAthletes';

interface LbRow {
  rank: number;
  profile_id: string;
  handle: string;
  school_name: string | null;
  value: number;
  verified: boolean;
  verification_method: string;
  ranked: boolean;
}

type Scope = 'everyone' | 'nearby' | 'school';

const SCOPE_OPTIONS: ReadonlyArray<{ key: Scope; label: string }> = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'school', label: 'My School' },
];

/**
 * Boards — production leaderboard, restyled to match the Phase 0 golden
 * reference. Real Supabase data drives the list; the only fixture fallback is
 * a DEV-only populated demo so reviewers don't see a blank board on a fresh
 * environment (prod still ships the proper EmptyState).
 *
 * Selection rows are capped at two per spec:
 *   1. Primary  — `Segmented` for the metric (first ≤4 of the current sport).
 *   2. Secondary — `Segmented` (scope) + a single sport `FilterChip` (Phase 2
 *      opens a sheet; for now it's a no-op affordance with the Trophy glyph).
 *
 * No emoji, no second accent, no podium. Ember lives only on the #1 rank, the
 * current-user row trailing value, and the active filter chip — combined that
 * stays well under the 10% pixel budget.
 */
export default function BoardsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const profileQ = useMyProfile();
  const myId = profileQ.data?.id ?? null;
  const hasSchool = !!profileQ.data?.school_id;

  const [sport, setSport] = useState<Sport>('football');
  const [scope, setScope] = useState<Scope>('everyone');
  const [metricKey, setMetricKey] = useState<string>('');
  const [appliedSchoolDefault, setAppliedSchoolDefault] = useState(false);

  // Default to My School the first time we see a school-bound profile; user
  // can flip back at will.
  useEffect(() => {
    if (hasSchool && !appliedSchoolDefault) {
      setScope('school');
      setAppliedSchoolDefault(true);
    }
  }, [hasSchool, appliedSchoolDefault]);

  const catalogQ = useMetricCatalog();
  const metricsForSport = useMemo(
    () =>
      (catalogQ.data ?? [])
        .filter((m) => m.sport === sport)
        .sort((a, b) => a.sort_order - b.sort_order),
    [catalogQ.data, sport],
  );
  // Segmented controls cap at ~5 options; per spec we show the top 4 metrics
  // for the current sport. Anything deeper belongs in a sheet (Phase 2).
  // DEV fallback: when the sport_metrics catalog is empty (fresh Supabase
  // project / unseeded environment), seed the rail with DEMO_METRICS so the
  // header doesn't collapse to a loading skeleton during review.
  const metricOptions = useMemo(() => {
    const real = metricsForSport.slice(0, 4).map((m) => ({ key: m.key, label: m.label }));
    if (real.length > 0) return real;
    if (__DEV__ && !catalogQ.isLoading && sport === 'football') {
      return DEMO_METRICS.slice(0, 4).map((m) => ({ key: m.key, label: m.label }));
    }
    return real;
  }, [metricsForSport, catalogQ.isLoading, sport]);
  const currentMetric = metricsForSport.find((m) => m.key === metricKey) ?? null;

  useEffect(() => {
    if (
      metricOptions.length > 0 &&
      !metricOptions.some((m) => m.key === metricKey)
    ) {
      setMetricKey(metricOptions[0].key);
    }
  }, [metricOptions, metricKey]);

  const boardQ = useQuery({
    queryKey: ['leaderboard', sport, metricKey, scope],
    enabled: !!metricKey,
    queryFn: async (): Promise<LbRow[]> => {
      const { data, error } = await supabase.rpc('leaderboard', {
        p_sport: sport,
        p_metric_key: metricKey,
        p_scope: scope,
        p_only_verified: false,
        p_limit: 100,
      });
      if (error) throw error;
      return (data as LbRow[]) ?? [];
    },
  });

  const rows = boardQ.data ?? [];
  const unit = currentMetric?.unit ?? null;

  // DEV fallback only — when the real RPC returns nothing in development, swap
  // in the demo board so the layout reads populated for design review. Prod
  // gets the proper EmptyState so users never see seeded names as their own.
  const useDemoFallback =
    __DEV__ && !boardQ.isLoading && !boardQ.isError && rows.length === 0;

  const displayRows: LeaderboardRowData[] = useDemoFallback
    ? DEMO_FORTY_BOARD.map((a) => ({
        rank: a.rank,
        handle: a.handle,
        school: a.school,
        avatarUrl: a.avatarUrl,
        value: a.value,
        weeklyDelta: a.weeklyDelta,
        tier: a.tier,
      }))
    : rows.map((r) => ({
        rank: r.rank,
        handle: r.handle,
        school: r.school_name,
        value: formatStatValue(r.value, unit),
        tier: tierOf(r.verified, r.verification_method),
      }));

  const demoCurrentIdx = useDemoFallback
    ? DEMO_FORTY_BOARD.findIndex((a) => a.isCurrentUser)
    : -1;

  // ── Header (sticky in the FlashList) ──────────────────────────────────────
  const header = (
    <View style={{ backgroundColor: colors.paper }}>
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[3],
          paddingBottom: space[4],
        }}
      >
        <MicroLabel>LEADERBOARDS</MicroLabel>
        <Txt
          variant="display3"
          accessibilityRole="header"
          style={{ marginTop: space[2] }}
        >
          Boards
        </Txt>
        <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
          {currentMetric
            ? `${SPORT_LABELS[sport]} · ${currentMetric.label}${
                currentMetric.unit ? ` (${currentMetric.unit})` : ''
              }`
            : `Live across ${displayRows.length} athletes`}
        </Txt>

        {/* Primary selector — metric. Empty rail collapses to a skeleton so the
            page height doesn't jump while the catalog loads. */}
        <View style={{ marginTop: space[4] }}>
          {metricOptions.length > 0 ? (
            <Segmented
              options={metricOptions}
              value={metricKey || metricOptions[0].key}
              onChange={setMetricKey}
            />
          ) : (
            <Skeleton h={40} radius="full" />
          )}
        </View>

        {/* Secondary selector — scope + single sport filter chip. */}
        <View
          style={{
            marginTop: space[3],
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[2],
          }}
        >
          <View style={{ flex: 1 }}>
            <Segmented<Scope>
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={setScope}
            />
          </View>
          <FilterChip
            label={SPORT_LABELS[sport]}
            leadingIcon="Trophy"
            active
            onPress={() => {
              // Phase 2: open sport sheet. For now cycle through sports so the
              // affordance isn't dead during review.
              const order: Sport[] = ['football', 'basketball', 'baseball', 'track'];
              const next = order[(order.indexOf(sport) + 1) % order.length];
              setSport(next);
            }}
          />
        </View>
      </View>

      <HairlineRule />
    </View>
  );

  // ── States ────────────────────────────────────────────────────────────────
  const renderRow = ({ item, index }: { item: LeaderboardRowData; index: number }) => {
    const isCurrentUser = useDemoFallback
      ? index === demoCurrentIdx
      : rows[index]?.profile_id === myId;
    const onPress = useDemoFallback
      ? undefined
      : () => router.push(`/player/${rows[index].profile_id}` as never);
    return (
      <LeaderboardRow
        row={item}
        unit={unit}
        isCurrentUser={isCurrentUser}
        onPress={onPress}
      />
    );
  };

  const loadingSkeleton = (
    <View style={{ paddingTop: space[2] }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: SCREEN_PADDING,
            minHeight: 64,
          }}
        >
          <Skeleton w={20} h={20} />
          <View style={{ width: space[3] }} />
          <Skeleton w={36} h={36} radius="full" />
          <View style={{ flex: 1, paddingHorizontal: space[3], gap: space[1] }}>
            <Skeleton w={120} h={14} />
            <Skeleton w={80} h={12} />
          </View>
          <Skeleton w={64} h={20} />
        </View>
      ))}
    </View>
  );

  const errorBlock = (
    <View
      style={{
        marginHorizontal: SCREEN_PADDING,
        marginTop: space[5],
        padding: space[4],
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        borderLeftWidth: 3,
        borderLeftColor: colors.error,
        gap: space[1],
      }}
      accessibilityRole="alert"
    >
      <Txt variant="bodySm" weight="bold">
        Board didn’t load.
      </Txt>
      <Txt variant="bodySm" tone="ash">
        Pull to retry — the leaderboard service hiccupped.
      </Txt>
    </View>
  );

  const emptyBlock = boardQ.isLoading ? null : boardQ.isError ? (
    errorBlock
  ) : scope !== 'everyone' && !hasSchool ? (
    <EmptyState
      icon="Target"
      title="Pick your school to see this board."
      body={
        scope === 'nearby'
          ? 'Nearby pulls from schools around yours.'
          : 'My School ranks the kids you actually line up against.'
      }
      ctaLabel="PICK YOUR SCHOOL"
      onPress={() => router.push('/(tabs)/you?edit=1' as never)}
    />
  ) : (
    <EmptyState
      icon="Trophy"
      title="Be the first name on this board."
      body="Drop a mark on the You tab — it lands here the second you save."
      ctaLabel="ADD YOUR FIRST MARK"
      onPress={() => router.push('/(tabs)/you' as never)}
    />
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}
    >
      <FlashList
        data={boardQ.isLoading ? [] : displayRows}
        keyExtractor={(item, idx) => `${item.handle}-${idx}`}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        renderItem={renderRow}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: colors.fog,
              marginLeft: SCREEN_PADDING + 36,
            }}
          />
        )}
        ListEmptyComponent={boardQ.isLoading ? loadingSkeleton : emptyBlock}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
