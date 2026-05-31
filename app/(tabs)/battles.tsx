import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { shareSnapshot } from '../../lib/share';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { Card } from '../../components/primitives/Card';
import { StatBlock, StatBlockRow } from '../../components/primitives/StatBlock';
import { Skeleton } from '../../components/primitives/Skeleton';
import { AppIcon } from '../../components/primitives/AppIcon';
import { AvatarMeta } from '../../components/composite/AvatarMeta';
import { EmptyState } from '../../components/composite/EmptyState';
import { Score } from '../../components/motion/Score';
import { VerifiedMark } from '../../components/composite/StatLine';
import { BattleShareCard } from '../../components/composite/BattleShareCard';
import { supabase } from '../../lib/supabase';
import {
  SPORTS,
  SPORT_LABELS,
  formatStatValue,
  useMetricCatalog,
  useMyProfile,
  useMyStats,
  useNearbyOpponents,
  useOpponentSearch,
  usePublicProfile,
  usePublicStats,
  useSchoolOpponents,
  type MetricRow,
  type MyProfile,
  type PlayerStat,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import { useTheme, space, radius, SCREEN_PADDING, type, fonts } from '../../theme';
import { recordActivity } from '../../lib/hooks/useStreak';
import { useNearbySchools } from '../../lib/hooks/useNearbySchools';
import {
  DEMO_CURRENT_USER,
  DEMO_RIVAL,
} from '../../data/fixtures/demoAthletes';

type Winner = 'me' | 'opp' | 'tie';

function decideWinner(metric: MetricRow, a: PlayerStat, b: PlayerStat): Winner {
  if (a.value === b.value) return 'tie';
  if (metric.direction === 'lower_better') return a.value < b.value ? 'me' : 'opp';
  return a.value > b.value ? 'me' : 'opp';
}

interface CompRow {
  metric: MetricRow;
  mine: PlayerStat;
  theirs: PlayerStat;
  // A comparison counts when both marks are in their plausible range. It's
  // "verified" (badged) only when both sides are peer-verified.
  bothPlausible: boolean;
  bothVerified: boolean;
  winner: Winner;
}

// One opponent row in the discovery lists. AvatarMeta on the left, a compact
// "BATTLE" CTA on the right. Hairlines between rows handle the separation;
// the row itself stays card-less so the lists read as one columnar grid.
function OpponentRow({ p, onPress }: { p: MyProfile; onPress: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING,
        paddingVertical: space[4],
        minHeight: 64,
        gap: space[3],
      }}
    >
      <View style={{ flex: 1 }}>
        <AvatarMeta
          avatarUrl={p.avatar_url ?? undefined}
          handle={p.handle ?? 'player'}
          meta={p.school?.name ?? undefined}
          size="md"
          onPress={onPress}
        />
      </View>
      <PrimaryButton
        label="BATTLE"
        size="compact"
        onPress={onPress}
        accessibilityLabel={`Battle @${p.handle ?? 'player'}`}
      />
    </View>
  );
}

// Section header for the discovery lists. Single MicroLabel above a hairline.
function SectionHeader({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: space[7],
        paddingBottom: space[2],
      }}
    >
      <MicroLabel>{label}</MicroLabel>
    </View>
  );
}

// Stat-by-stat row. Left = your value, center = label, right = theirs. The
// winning side is the one ember beat on the line; ties stay monochrome.
function ComparisonRow({ row, showWinner, verified }: { row: CompRow; showWinner: boolean; verified?: boolean }) {
  const unit = row.metric.unit;
  const meWins = showWinner && row.winner === 'me';
  const oppWins = showWinner && row.winner === 'opp';
  const tie = showWinner && row.winner === 'tie';

  return (
    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Score
            value={formatStatValue(row.mine.value, unit)}
            size="md"
            tone={meWins ? 'ember' : 'ink'}
          />
        </View>

        <View style={{ flex: 1.2, alignItems: 'center', paddingHorizontal: space[2] }}>
          <MicroLabel tone="ash">{row.metric.label}</MicroLabel>
          {unit ? (
            <Txt
              variant="bodySm"
              tone="ash"
              style={{ marginTop: 2 }}
            >
              {unit}
            </Txt>
          ) : null}
          {tie ? (
            <MicroLabel tone="ink" style={{ marginTop: space[2] }}>TIE</MicroLabel>
          ) : null}
          {verified ? (
            <View style={{ marginTop: space[2] }}>
              <VerifiedMark verified />
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Score
            value={formatStatValue(row.theirs.value, unit)}
            size="md"
            tone={oppWins ? 'ember' : 'ink'}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * BattleOfWeekCard — the hero VS card the screen opens on. Mirrors the
 * golden you.tsx "Battle of the Week" pattern: overlay-tier Card, two
 * avatars + handle + score columns, ash "vs" divider, hairline, footer row
 * with margin caption + a single ember "Beat it" CTA pill. All values flow
 * from tokens; no raw hex, no raw radii.
 *
 * `winner` flips the ember tint onto the leading side's Score. Ties stay
 * monochrome so the accent never lies.
 */
interface BattleOfWeekCardProps {
  meHandle: string;
  meAvatarUrl?: string;
  meValue: string;
  oppHandle: string;
  oppAvatarUrl?: string;
  oppValue: string;
  metricLabel: string;
  marginLabel: string | null;
  endsLabel: string;
  winner: Winner | null;
  onBeatIt: () => void;
}

function BattleOfWeekCard({
  meHandle,
  meAvatarUrl,
  meValue,
  oppHandle,
  oppAvatarUrl,
  oppValue,
  metricLabel,
  marginLabel,
  endsLabel,
  winner,
  onBeatIt,
}: BattleOfWeekCardProps) {
  const { colors } = useTheme();
  const meWins = winner === 'me';
  const oppWins = winner === 'opp';

  return (
    <Card tone="overlay" padded>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space[4],
        }}
      >
        <MicroLabel>BATTLE OF THE WEEK</MicroLabel>
        <MicroLabel tone="ash">{metricLabel.toUpperCase()}</MicroLabel>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Avatar uri={meAvatarUrl} seed={meHandle} size={56} />
          <Txt
            variant="bodySm"
            weight="semibold"
            numberOfLines={1}
            style={{ marginTop: space[2] }}
          >
            @{meHandle}
          </Txt>
          <Score
            value={meValue}
            size="md"
            tone={meWins ? 'ember' : 'ink'}
            style={{ marginTop: space[1] }}
          />
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: space[2] }}>
          <Txt variant="display4" weight="extrabold" tone="ash">
            vs
          </Txt>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Avatar uri={oppAvatarUrl} seed={oppHandle} size={56} />
          <Txt
            variant="bodySm"
            weight="semibold"
            numberOfLines={1}
            style={{ marginTop: space[2] }}
          >
            @{oppHandle}
          </Txt>
          <Score
            value={oppValue}
            size="md"
            tone={oppWins ? 'ember' : 'ink'}
            style={{ marginTop: space[1] }}
          />
        </View>
      </View>

      <HairlineRule style={{ marginVertical: space[4] }} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space[3],
        }}
      >
        <View style={{ flex: 1 }}>
          {marginLabel ? (
            <Txt variant="bodySm" weight="semibold">
              {marginLabel}
            </Txt>
          ) : (
            <Txt variant="bodySm" weight="semibold">
              Drop a mark to enter
            </Txt>
          )}
          <Txt variant="bodySm" tone="ash" style={{ marginTop: 2 }}>
            {endsLabel}
          </Txt>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onBeatIt();
          }}
          accessibilityRole="button"
          accessibilityLabel="Beat it"
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: space[5],
            paddingVertical: space[2],
            borderRadius: radius.full,
            backgroundColor: pressed ? colors.emberPressed : colors.ember,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Txt variant="bodySm" weight="bold" tone="paper">
            Beat it
          </Txt>
        </Pressable>
      </View>
    </Card>
  );
}

/**
 * Skeleton placeholder matching BattleOfWeekCard's footprint so the loading
 * state doesn't shift layout. Uses `Skeleton` primitive only — no raw colors.
 */
function BattleOfWeekSkeleton() {
  return (
    <Card tone="overlay" padded>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space[4],
        }}
      >
        <Skeleton w={140} h={10} />
        <Skeleton w={72} h={10} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <View style={{ flex: 1, alignItems: 'center', gap: space[2] }}>
          <Skeleton w={56} h={56} radius="full" />
          <Skeleton w={72} h={12} />
          <Skeleton w={56} h={24} radius="sm" />
        </View>
        <Skeleton w={32} h={28} radius="sm" />
        <View style={{ flex: 1, alignItems: 'center', gap: space[2] }}>
          <Skeleton w={56} h={56} radius="full" />
          <Skeleton w={72} h={12} />
          <Skeleton w={56} h={24} radius="sm" />
        </View>
      </View>
      <HairlineRule style={{ marginVertical: space[4] }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: space[1] }}>
          <Skeleton w={120} h={12} />
          <Skeleton w={80} h={10} />
        </View>
        <Skeleton w={88} h={44} radius="full" />
      </View>
    </Card>
  );
}

// Pluralise the metric unit for the human-readable margin caption. Reuses
// `formatStatValue` so the number style matches what the row shows.
function formatMargin(
  metric: MetricRow | null,
  mineValue: number,
  theirsValue: number,
): string | null {
  if (!metric) return null;
  const diff = Math.abs(mineValue - theirsValue);
  if (diff === 0) return 'Margin: tie';
  return `Margin: ${formatStatValue(diff, metric.unit)}${metric.unit ?? ''}`;
}

export default function BattlesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const queryClient = useQueryClient();

  const meQ = useMyProfile();
  const me = meQ.data;
  // Don't dead-end on missing primary_sport. Fall back to football so the
  // discovery lists, search and Battle of the Week have something to query;
  // a slim inline prompt above invites the user to set it for real.
  const primarySportMissing = !me?.primary_sport;
  const mySport: Sport =
    (me?.primary_sport as Sport | undefined) ?? 'football';

  const myStatsQ = useMyStats();
  const myStats = useMemo(() => myStatsQ.data ?? [], [myStatsQ.data]);

  const [query, setQuery] = useState('');
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [sportPromptDismissed, setSportPromptDismissed] = useState(false);

  const searchQ = useOpponentSearch(query, mySport, me?.id);
  const schoolQ = useSchoolOpponents(me?.school_id ?? null, mySport, me?.id);

  // BATTLE OF THE WEEK — top athlete on the user's primary metric, scoped to
  // their school when known, else everyone. Pre-populates a CTA so the tab
  // is never an empty dead-end.
  const catalogQ = useMetricCatalog();
  const primaryMetricKey = useMemo(() => {
    const list = (catalogQ.data ?? [])
      .filter((m) => m.sport === mySport)
      .sort((a, b) => a.sort_order - b.sort_order);
    return list[0]?.key ?? null;
  }, [catalogQ.data, mySport]);

  const botwQ = useQuery({
    queryKey: ['battle-of-week', mySport, primaryMetricKey, me?.school_id ?? null, me?.id ?? null],
    enabled: !!primaryMetricKey && !!me?.id,
    queryFn: async (): Promise<{
      profile_id: string;
      handle: string;
      school: string | null;
      avatar_url: string | null;
      value: number;
    } | null> => {
      const scope = me?.school_id ? 'school' : 'everyone';
      const { data, error } = await supabase.rpc('leaderboard', {
        p_sport: mySport,
        p_metric_key: primaryMetricKey,
        p_scope: scope,
        p_only_verified: false,
        p_limit: 5,
      });
      if (error) throw error;
      const rows = (data as Array<{
        profile_id: string;
        handle: string;
        school_name: string | null;
        value: number;
      }> | null) ?? [];
      const top = rows.find((r) => r.profile_id !== me?.id);
      if (!top) return null;
      // Pull the opponent's avatar for the populated VS card.
      const { data: prof } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', top.profile_id)
        .maybeSingle();
      return {
        profile_id: top.profile_id,
        handle: top.handle,
        school: top.school_name,
        avatar_url: (prof as { avatar_url: string | null } | null)?.avatar_url ?? null,
        value: top.value,
      };
    },
  });

  // The catalog row for the primary metric — used to label the BoTW VS card
  // (e.g. "40-YD DASH") and to format my matching mark + margin in tokens.
  const primaryMetric = useMemo<MetricRow | null>(() => {
    if (!primaryMetricKey) return null;
    return (
      (catalogQ.data ?? []).find(
        (m) => m.sport === mySport && m.key === primaryMetricKey,
      ) ?? null
    );
  }, [catalogQ.data, mySport, primaryMetricKey]);

  // My current mark on the same metric (if any) — drives the populated left
  // side of the VS card and the "Margin" footer.
  const myPrimaryStat = useMemo<PlayerStat | null>(() => {
    if (!primaryMetric) return null;
    return myStats.find((s) => s.metric.id === primaryMetric.id) ?? null;
  }, [myStats, primaryMetric]);

  // "NEARBY" — opt-in, location-driven discovery. Tapping the CTA hits the
  // foreground permission once; coords are never stored (see useNearbySchools).
  const nearbySchools = useNearbySchools(8);
  const nearbySchoolIds = (nearbySchools.data ?? []).map((s) => s.id);
  const nearbyOpponentsQ = useNearbyOpponents(
    nearbySchoolIds.length ? nearbySchoolIds : null,
    mySport,
    me?.id,
    me?.school_id ?? null,
  );

  const oppProfileQ = usePublicProfile(opponentId ?? undefined);
  const oppStatsQ = usePublicStats(opponentId ?? undefined);
  const opp = oppProfileQ.data;
  const oppStats = useMemo(() => oppStatsQ.data ?? [], [oppStatsQ.data]);

  const cardRef = useRef<View>(null);

  const comparison = useMemo<CompRow[]>(() => {
    const byMetric = new Map<string, PlayerStat>();
    for (const s of oppStats) byMetric.set(s.metric.id, s);
    const rows: CompRow[] = [];
    for (const mine of myStats) {
      const theirs = byMetric.get(mine.metric.id);
      if (!theirs) continue;
      const bothPlausible = mine.is_plausible !== false && theirs.is_plausible !== false;
      const bothVerified = mine.verified && theirs.verified;
      rows.push({
        metric: mine.metric,
        mine,
        theirs,
        bothPlausible,
        bothVerified,
        winner: decideWinner(mine.metric, mine, theirs),
      });
    }
    rows.sort((a, b) => a.metric.sort_order - b.metric.sort_order);
    return rows;
  }, [myStats, oppStats]);

  // Primary tally: every plausible shared mark counts (verified or not), so
  // battles aren't stuck 0–0. Implausible marks stay out. The verified-only
  // sub-tally is the subset where both sides are peer-verified.
  const countedRows = comparison.filter((r) => r.bothPlausible);
  const notCounted = comparison.filter((r) => !r.bothPlausible);
  const verifiedRows = countedRows.filter((r) => r.bothVerified);
  const myWins = countedRows.filter((r) => r.winner === 'me').length;
  const oppWins = countedRows.filter((r) => r.winner === 'opp').length;
  const ties = countedRows.filter((r) => r.winner === 'tie').length;
  const vMyWins = verifiedRows.filter((r) => r.winner === 'me').length;
  const vOppWins = verifiedRows.filter((r) => r.winner === 'opp').length;

  const sportLabel = mySport ? SPORT_LABELS[mySport as Sport] ?? null : null;

  const pick = (id: string) => {
    Haptics.selectionAsync();
    setOpponentId(id);
  };

  const share = async () => {
    // Filing (sharing) a battle is a core-loop action — advance the streak,
    // fire-and-forget so it counts even if the OS share sheet is dismissed.
    void recordActivity(queryClient);
    await shareSnapshot(cardRef, 'Share this battle');
  };

  // ── Selection view ────────────────────────────────────────
  if (!opponentId) {
    const searchResults = searchQ.data ?? [];
    const schoolResults = schoolQ.data ?? [];
    const nearbyResults = nearbyOpponentsQ.data ?? [];
    const isSearching = query.trim().length >= 2;
    const hasAnyDiscovery = schoolResults.length > 0 || nearbyResults.length > 0;

    // ── Battle of the Week — populate from prod, else fall back to the
    // demo rivalry in DEV so the hero card is never empty during build /
    // QA. Production with no data still goes through the same loading /
    // error states; this branch is gated on `__DEV__`.
    const botwLoading = botwQ.isLoading || catalogQ.isLoading;
    const botwError = botwQ.isError || catalogQ.isError;

    type BotwView = {
      meHandle: string;
      meAvatarUrl?: string;
      meValue: string;
      meValueNum: number | null;
      oppHandle: string;
      oppAvatarUrl?: string;
      oppValue: string;
      oppValueNum: number;
      metric: MetricRow | null;
      metricLabel: string;
      onBeatIt: () => void;
    };

    let botwView: BotwView | null = null;
    if (botwQ.data && primaryMetric) {
      const opp = botwQ.data;
      botwView = {
        meHandle: me?.handle ?? 'you',
        meAvatarUrl: me?.avatar_url ?? undefined,
        meValue: myPrimaryStat
          ? `${formatStatValue(myPrimaryStat.value, primaryMetric.unit)}${primaryMetric.unit ?? ''}`
          : '—',
        meValueNum: myPrimaryStat?.value ?? null,
        oppHandle: opp.handle,
        oppAvatarUrl: opp.avatar_url ?? undefined,
        oppValue: `${formatStatValue(opp.value, primaryMetric.unit)}${primaryMetric.unit ?? ''}`,
        oppValueNum: opp.value,
        metric: primaryMetric,
        metricLabel: primaryMetric.label,
        onBeatIt: () => setOpponentId(opp.profile_id),
      };
    } else if (__DEV__ && !botwLoading && !botwError) {
      // Demo fallback — DEMO_CURRENT_USER vs DEMO_RIVAL, 40-yd dash.
      botwView = {
        meHandle: DEMO_CURRENT_USER.handle,
        meAvatarUrl: DEMO_CURRENT_USER.avatarUrl,
        meValue: DEMO_CURRENT_USER.value,
        meValueNum: DEMO_CURRENT_USER.rawValue,
        oppHandle: DEMO_RIVAL.handle,
        oppAvatarUrl: DEMO_RIVAL.avatarUrl,
        oppValue: DEMO_RIVAL.value,
        oppValueNum: DEMO_RIVAL.rawValue,
        metric: null,
        metricLabel: '40-yd Dash',
        // Demo-only: no real opponent id to route to, so the press just
        // selection-haptics. Real production data wires through onBeatIt.
        onBeatIt: () => Haptics.selectionAsync(),
      };
    }

    // Winner + margin caption. Honors `direction` when we have the metric
    // (lower-better for 40-yd, higher-better for vert). Falls back to a
    // lower-better assumption for the demo rivalry (40-yd dash).
    let botwWinner: Winner | null = null;
    let botwMargin: string | null = null;
    if (botwView && botwView.meValueNum != null) {
      const m = botwView.meValueNum;
      const o = botwView.oppValueNum;
      if (m === o) botwWinner = 'tie';
      else {
        const lowerBetter =
          botwView.metric?.direction === 'lower_better' || botwView.metric == null;
        botwWinner = lowerBetter
          ? m < o
            ? 'me'
            : 'opp'
          : m > o
            ? 'me'
            : 'opp';
      }
      botwMargin = botwView.metric
        ? formatMargin(botwView.metric, m, o)
        : `Margin: ${Math.abs(m - o).toFixed(2)}s`;
    }

    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        {/* Sticky header — screen title + caption. Sits on `paper` with a
            hairline underline. No accent here; ember is reserved for the
            "Beat it" CTA and live winning side in the hero VS card. */}
        <View
          style={{
            backgroundColor: colors.paper,
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[3],
            paddingBottom: space[4],
          }}
        >
          <Txt
            variant="display3"
            weight="bold"
            accessibilityRole="header"
          >
            Battles
          </Txt>
          <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
            Line up your stats against another athlete in {sportLabel ?? 'your sport'}.
          </Txt>
        </View>
        <HairlineRule />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        >
          {primarySportMissing && !sportPromptDismissed ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space[5] }}>
              <Card
                tone="surface"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[3],
                  paddingHorizontal: space[3],
                  paddingVertical: space[3],
                }}
              >
                <AppIcon name="Swords" size={16} tone="ash" />
                <Pressable
                  onPress={() => router.push('/(tabs)/you?edit=1' as never)}
                  style={{ flex: 1 }}
                  accessibilityRole="link"
                  accessibilityLabel="Set your primary sport"
                >
                  <Txt variant="bodySm" weight="semibold">
                    Set your primary sport so we line up like-for-like →
                  </Txt>
                  <Txt variant="micro" tone="ash" style={{ marginTop: 2 }}>
                    Showing {SPORT_LABELS[mySport]} for now.
                  </Txt>
                </Pressable>
                <Pressable
                  onPress={() => setSportPromptDismissed(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss"
                >
                  <AppIcon name="X" size={16} tone="ash" />
                </Pressable>
              </Card>
            </View>
          ) : null}

          {/* BATTLE OF THE WEEK — populated hero VS card. Three states are
              explicit: skeleton while loading, inline error if the RPC
              failed, populated card otherwise (with the demo fallback in
              __DEV__). The whole module sits on overlay so it reads as the
              single hero of the screen. */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space[5] }}>
            {botwLoading ? (
              <BattleOfWeekSkeleton />
            ) : botwError ? (
              <Card tone="overlay" padded>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space[3],
                  }}
                >
                  <AppIcon name="Swords" size={20} tone="ash" />
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" weight="semibold">
                      Couldn&apos;t load this week&apos;s battle.
                    </Txt>
                    <Txt variant="bodySm" tone="ash" style={{ marginTop: 2 }}>
                      Pull to refresh, or pick an opponent below.
                    </Txt>
                  </View>
                </View>
              </Card>
            ) : botwView ? (
              <BattleOfWeekCard
                meHandle={botwView.meHandle}
                meAvatarUrl={botwView.meAvatarUrl}
                meValue={botwView.meValue}
                oppHandle={botwView.oppHandle}
                oppAvatarUrl={botwView.oppAvatarUrl}
                oppValue={botwView.oppValue}
                metricLabel={botwView.metricLabel}
                marginLabel={botwMargin}
                endsLabel="Ends Sunday"
                winner={botwWinner}
                onBeatIt={botwView.onBeatIt}
              />
            ) : null}
          </View>

          {(
            <>
              {/* Search input — Strava-style pill. `surface` bg, full
                  radius, Lucide Search icon, ash placeholder. Tokens only. */}
              <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space[3],
                    backgroundColor: colors.surface,
                    borderRadius: radius.full,
                    paddingHorizontal: space[4],
                    paddingVertical: space[3],
                    minHeight: 44,
                  }}
                >
                  <AppIcon name="Search" size={18} tone="ash" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by handle"
                    placeholderTextColor={colors.ash}
                    autoCapitalize="none"
                    autoCorrect={false}
                    allowFontScaling={false}
                    // Match bodyLg type so the input feels typographic, not
                    // chrome. Family + size both come from theme tokens.
                    style={[
                      type.bodyLg,
                      {
                        flex: 1,
                        color: colors.ink,
                        paddingVertical: 0,
                        fontFamily: fonts.medium,
                      },
                    ]}
                  />
                  {query.length > 0 ? (
                    <Pressable
                      onPress={() => {
                        Haptics.selectionAsync();
                        setQuery('');
                      }}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <AppIcon name="X" size={16} tone="ash" />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* TRENDING — search results when the query is active. Same row
                  visual as the other sections so the lists feel continuous. */}
              {isSearching ? (
                <>
                  <SectionHeader label="TRENDING" />
                  <HairlineRule />
                  {searchQ.isFetching ? (
                    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                      <ActivityIndicator color={colors.ink} />
                    </View>
                  ) : searchResults.length === 0 ? (
                    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                      <Txt variant="body" tone="ash">
                        No {sportLabel?.toLowerCase() ?? 'sport'} athletes by that handle.
                      </Txt>
                    </View>
                  ) : (
                    searchResults.map((p, i) => (
                      <View key={p.id}>
                        <OpponentRow p={p} onPress={() => pick(p.id)} />
                        {i < searchResults.length - 1 && <HairlineRule />}
                      </View>
                    ))
                  )}
                </>
              ) : null}

              {/* FROM YOUR SCHOOL — same-sport teammates. */}
              <SectionHeader label="FROM YOUR SCHOOL" />
              <HairlineRule />
              {schoolResults.length === 0 ? (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                  {me?.school_id ? (
                    <>
                      <Txt variant="display4" weight="bold">
                        First name on the wall.
                      </Txt>
                      <Txt variant="body" tone="ash" style={{ marginTop: space[3] }}>
                        Send your share card to a teammate — they sign up, they show up here.
                      </Txt>
                    </>
                  ) : (
                    <>
                      <Txt variant="display4" weight="bold">
                        Pick your school to find teammates.
                      </Txt>
                      <View style={{ marginTop: space[4] }}>
                        <PrimaryButton
                          label="PICK YOUR SCHOOL"
                          variant="ghost"
                          full
                          onPress={() => {
                            Haptics.selectionAsync();
                            router.push('/(tabs)/you?edit=1' as never);
                          }}
                        />
                      </View>
                    </>
                  )}
                </View>
              ) : (
                schoolResults.map((p, i) => (
                  <View key={p.id}>
                    <OpponentRow p={p} onPress={() => pick(p.id)} />
                    {i < schoolResults.length - 1 && <HairlineRule />}
                  </View>
                ))
              )}

              {/* NEARBY — location-driven, opt-in. The first tap requests
                  foreground permission; coords leave the device once (RPC)
                  and are never persisted (see useNearbySchools). */}
              <SectionHeader label="NEARBY" />
              <HairlineRule />
              {nearbySchools.data == null ? (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                  <Txt variant="body" tone="ash" style={{ marginBottom: space[4] }}>
                    Find rivals at schools around yours.
                  </Txt>
                  {nearbySchools.loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
                      <ActivityIndicator color={colors.ink} />
                      <MicroLabel>FINDING SCHOOLS NEAR YOU…</MicroLabel>
                    </View>
                  ) : (
                    <>
                      <PrimaryButton
                        label="SHOW SCHOOLS NEAR ME"
                        variant="ghost"
                        full
                        onPress={() => {
                          Haptics.selectionAsync();
                          void nearbySchools.locate(8);
                        }}
                      />
                      {nearbySchools.denied ? (
                        <MicroLabel style={{ marginTop: space[3] }}>NO LOCATION — STAY AT YOUR SCHOOL</MicroLabel>
                      ) : null}
                    </>
                  )}
                </View>
              ) : nearbyResults.length === 0 ? (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                  <Txt variant="display4" weight="bold">
                    Nobody at the neighbors — yet.
                  </Txt>
                  <Txt variant="body" tone="ash" style={{ marginTop: space[3] }}>
                    The kids at the schools around you haven&apos;t put marks up.
                  </Txt>
                </View>
              ) : (
                nearbyResults.map((p, i) => (
                  <View key={p.id}>
                    <OpponentRow p={p} onPress={() => pick(p.id)} />
                    {i < nearbyResults.length - 1 && <HairlineRule />}
                  </View>
                ))
              )}

              {/* Empty state — only when neither query nor discovery has any
                  rows to show. EmptyState composite with on-voice line +
                  primary CTA so the screen never dead-ends. */}
              {!isSearching && !hasAnyDiscovery ? (
                <EmptyState
                  icon="Swords"
                  title="No battles yet."
                  body="Challenge a rival on the board — they show up here the second they accept."
                  ctaLabel="OPEN THE BOARD"
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push('/(tabs)/index' as never);
                  }}
                />
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Comparison view ───────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      {/* Compact chrome bar — change opponent (back) on the left, view
          profile on the right. Hairline underline closes it off. */}
      <View
        style={{
          height: 48,
          paddingHorizontal: SCREEN_PADDING,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setOpponentId(null);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Change opponent"
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}
        >
          <AppIcon name="ChevronLeft" size={18} tone="ink" />
          <MicroLabel tone="ink">CHANGE OPPONENT</MicroLabel>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/player/${opponentId}` as never)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="View opponent profile"
        >
          <MicroLabel tone="ink">VIEW PROFILE</MicroLabel>
        </Pressable>
      </View>
      <HairlineRule />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
      >
        {/* Two-avatar header — both faces side-by-side with an ember "VS"
            label between. The whole band sits on `surface` so it reads as
            one elevated module before the lines below. */}
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[7],
            paddingBottom: space[7],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, alignItems: 'center', gap: space[3] }}>
              <Avatar uri={me?.avatar_url ?? undefined} seed={me?.handle ?? 'you'} size={88} />
              <Txt
                variant="bodyLg"
                weight="semibold"
                numberOfLines={1}
                style={{ marginTop: space[1], fontVariant: ['tabular-nums'] }}
              >
                @{me?.handle ?? 'you'}
              </Txt>
              {me?.school?.name ? (
                <Txt
                  variant="bodySm"
                  tone="ash"
                  numberOfLines={1}
                  style={{ textAlign: 'center' }}
                >
                  {me.school.name}
                </Txt>
              ) : null}
            </View>

            <View
              style={{
                width: 56,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: space[2],
              }}
            >
              <MicroLabel style={{ color: colors.ember, letterSpacing: 1.6 }}>
                VS
              </MicroLabel>
            </View>

            <View style={{ flex: 1, alignItems: 'center', gap: space[3] }}>
              <Avatar uri={opp?.avatar_url ?? undefined} seed={opp?.handle ?? ''} size={88} />
              <Txt
                variant="bodyLg"
                weight="semibold"
                numberOfLines={1}
                style={{ marginTop: space[1], fontVariant: ['tabular-nums'] }}
              >
                @{opp?.handle ?? ''}
              </Txt>
              {opp?.school?.name ? (
                <Txt
                  variant="bodySm"
                  tone="ash"
                  numberOfLines={1}
                  style={{ textAlign: 'center' }}
                >
                  {opp.school.name}
                </Txt>
              ) : null}
            </View>
          </View>
        </View>

        {/* TALLY BAND — WINS / TIES / LOSSES (you vs them). The winning side
            per metric is the orange one; tie is neutral. StatBlockRow gives
            the hairline dividers between blocks. */}
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: space[7],
          }}
        >
          <StatBlockRow>
            <StatBlock
              value={myWins}
              label="WINS"
              align="center"
              size="lg"
              tone={myWins > oppWins ? 'accent' : 'default'}
            />
            <StatBlock
              value={ties}
              label="TIES"
              align="center"
              size="lg"
            />
            <StatBlock
              value={oppWins}
              label="LOSSES"
              align="center"
              size="lg"
              tone={oppWins > myWins ? 'accent' : 'default'}
            />
          </StatBlockRow>

          {verifiedRows.length > 0 ? (
            <View style={{ alignItems: 'center', marginTop: space[5] }}>
              <MicroLabel>{`VERIFIED ONLY · ${vMyWins}–${vOppWins}`}</MicroLabel>
            </View>
          ) : null}
        </View>

        {oppProfileQ.isLoading || oppStatsQ.isLoading ? (
          <View style={{ paddingVertical: space[8], alignItems: 'center' }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : comparison.length === 0 ? (
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: space[9],
              alignItems: 'center',
            }}
          >
            <View style={{ marginBottom: space[4] }}>
              <AppIcon name="Swords" size={48} tone="ash" />
            </View>
            <Txt variant="display4" weight="bold" style={{ textAlign: 'center' }}>
              No shared metrics yet.
            </Txt>
            <Txt
              variant="body"
              tone="ash"
              style={{ marginTop: space[3], textAlign: 'center' }}
            >
              You both need a stat on the same metric to compare.
            </Txt>
          </View>
        ) : (
          <>
            {/* Stat-by-stat rows — every plausible shared mark counts. Rows
                verified on both sides earn a small mark; the orange goes on
                the winning side's Score. Ties stay neutral. */}
            <View
              style={{
                paddingHorizontal: SCREEN_PADDING,
                paddingTop: space[7],
                paddingBottom: space[2],
              }}
            >
              <MicroLabel>ALL MARKS · BOTH IN RANGE</MicroLabel>
            </View>
            <HairlineRule />
            {countedRows.length === 0 ? (
              <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                <Txt variant="body" tone="ash">
                  No in-range marks on the same metric yet.
                </Txt>
              </View>
            ) : (
              countedRows.map((row, i) => (
                <View key={row.metric.id}>
                  <ComparisonRow row={row} showWinner verified={row.bothVerified} />
                  {i < countedRows.length - 1 && <HairlineRule />}
                </View>
              ))
            )}

            {/* Share card — preserved as the capture target. Sits inside the
                flow with a primary "Share battle" CTA + a ghost "End battle"
                that returns to discovery. */}
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
              <BattleShareCard
                ref={cardRef}
                meHandle={me?.handle ?? 'you'}
                oppHandle={opp?.handle ?? ''}
                sportLabel={sportLabel}
                myWins={myWins}
                oppWins={oppWins}
                hasUncounted={notCounted.length > 0}
              />
              <PrimaryButton
                label="SHARE BATTLE"
                full
                onPress={share}
                style={{ marginTop: space[4] }}
              />
              <PrimaryButton
                label="END BATTLE"
                variant="ghost"
                full
                onPress={() => {
                  Haptics.selectionAsync();
                  setOpponentId(null);
                }}
                style={{ marginTop: space[3] }}
              />
            </View>

            {/* Not counted — a mark is outside its plausible range on one or
                both sides, so it stays out of the tally. Dimmed but legible. */}
            {notCounted.length > 0 ? (
              <>
                <View
                  style={{
                    paddingHorizontal: SCREEN_PADDING,
                    paddingTop: space[8],
                    paddingBottom: space[2],
                  }}
                >
                  <MicroLabel>OUTSIDE EXPECTED RANGE · NOT COUNTED</MicroLabel>
                </View>
                <HairlineRule />
                {notCounted.map((row, i) => (
                  <View key={row.metric.id} style={{ opacity: 0.6 }}>
                    <ComparisonRow row={row} showWinner={false} />
                    {i < notCounted.length - 1 && <HairlineRule />}
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
