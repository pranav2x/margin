import { useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { AppIcon } from '../../components/primitives/AppIcon';
import { Segmented } from '../../components/primitives/Segmented';
import { FilterChip } from '../../components/primitives/FilterChip';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { LeaderboardRow } from '../../components/composite/LeaderboardRow';

import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';
import {
  DEMO_FORTY_BOARD,
  DEMO_METRICS,
} from '../../data/fixtures/demoAthletes';

type ScopeKey = 'everyone' | 'nearby' | 'school';
type MetricKey = (typeof DEMO_METRICS)[number]['key'];

const SCOPE_OPTIONS: ReadonlyArray<{ key: ScopeKey; label: string }> = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'nearby',   label: 'Nearby' },
  { key: 'school',   label: 'My School' },
];

const METRIC_OPTIONS: ReadonlyArray<{ key: MetricKey; label: string }> = DEMO_METRICS.map((m) => ({
  key: m.key as MetricKey,
  label: m.label,
}));

/**
 * Boards — golden reference. ONE accent (current-user row + #1 rank +
 * filter-chip active state). Max two visible selection rows. Real list,
 * highlighted current user, no empty space.
 */
export default function GoldenBoards() {
  const { colors } = useTheme();
  const router = useRouter();
  const [scope, setScope]   = useState<ScopeKey>('everyone');
  const [metric, setMetric] = useState<MetricKey>('forty');

  const unit = DEMO_METRICS.find((m) => m.key === metric)?.unit ?? '';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[3], paddingBottom: space[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <AppIcon name="ChevronLeft" size={24} tone="ink" />
          </Pressable>
          <AppIcon name="Search" size={20} tone="ash" />
        </View>

        <Txt variant="display3" style={{ marginTop: space[2] }}>Boards</Txt>
        <Txt variant="bodySm" tone="ash" style={{ marginTop: 2 }}>
          Live across {DEMO_FORTY_BOARD.length} athletes
        </Txt>

        {/* Primary selector — metric (4 options). */}
        <View style={{ marginTop: space[4] }}>
          <Segmented<MetricKey>
            options={METRIC_OPTIONS}
            value={metric}
            onChange={setMetric}
          />
        </View>

        {/* Secondary selector — scope (3 options) + single sport filter chip. */}
        <View
          style={{
            marginTop: space[3],
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[2],
          }}
        >
          <View style={{ flex: 1 }}>
            <Segmented<ScopeKey>
              options={SCOPE_OPTIONS}
              value={scope}
              onChange={setScope}
            />
          </View>
          <FilterChip
            label="Football"
            leadingIcon="Trophy"
            active
            onPress={() => { /* Phase 1: open sport sheet */ }}
          />
        </View>
      </View>

      <HairlineRule />

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <FlatList
        data={DEMO_FORTY_BOARD}
        keyExtractor={(a) => a.handle}
        contentContainerStyle={{ paddingBottom: space[8] }}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: colors.fog, marginLeft: SCREEN_PADDING + 36 }} />
        )}
        renderItem={({ item }) => (
          <LeaderboardRow
            row={{
              rank: item.rank,
              handle: item.handle,
              school: item.school,
              avatarUrl: item.avatarUrl,
              value: item.value,
              weeklyDelta: item.weeklyDelta,
              tier: item.tier,
            }}
            unit={unit}
            isCurrentUser={!!item.isCurrentUser}
          />
        )}
      />

      {/* Pinned current-user CTA — Strava-style. */}
      <View
        style={{
          position: 'absolute',
          left: SCREEN_PADDING,
          right: SCREEN_PADDING,
          bottom: space[5],
          backgroundColor: colors.popover,
          borderRadius: radius.full,
          paddingHorizontal: space[4],
          paddingVertical: space[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
        }}
      >
        <View
          style={{
            width: 32, height: 32, borderRadius: radius.full,
            backgroundColor: colors.ember,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <AppIcon name="Plus" size={18} tone="paper" />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="bodySm" weight="semibold">Beat your 4.56s</Txt>
          <Txt variant="bodySm" tone="ash">5 spots up since last week</Txt>
        </View>
        <AppIcon name="ChevronRight" size={18} tone="ash" />
      </View>
    </SafeAreaView>
  );
}
