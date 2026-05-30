import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { AppIcon } from '../../components/primitives/AppIcon';
import { Card } from '../../components/primitives/Card';
import { Score } from '../../components/motion/Score';
import { TabPill } from '../../components/composite/TabPill';
import { SportChip, SPORT_GLYPHS } from '../../components/primitives/SportChip';
import { Segmented } from '../../components/primitives/Segmented';
import {
  LeaderboardRow,
  type LeaderboardRowData,
} from '../../components/composite/LeaderboardRow';
import { tierOf } from '../../components/primitives/VerifiedBadge';
import { EmptyState } from '../../components/composite/EmptyState';
import { supabase } from '../../lib/supabase';
import {
  SPORTS,
  SPORT_LABELS,
  formatStatValue,
  useMetricCatalog,
  useMyProfile,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import { useTheme, space, SCREEN_PADDING } from '../../theme';

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

const SCOPES = [
  { key: 'everyone', label: 'Everyone', phrase: 'EVERYWHERE' },
  { key: 'nearby', label: 'Nearby', phrase: 'NEARBY' },
  { key: 'school', label: 'My School', phrase: 'AT YOUR SCHOOL' },
] as const;
type Scope = (typeof SCOPES)[number]['key'];

function toRowData(row: LbRow): LeaderboardRowData {
  return {
    rank: row.rank,
    handle: row.handle,
    school: row.school_name,
    value: '', // value formatting needs the unit, filled at render time
    tier: tierOf(row.verified, row.verification_method),
  };
}

export default function BoardsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const profileQ = useMyProfile();
  const myId = profileQ.data?.id ?? null;
  const hasSchool = !!profileQ.data?.school_id;

  // Default scope = Everyone. Once the user has a school, the default flips
  // to My School the first time the screen mounts — but they can flip back.
  const [sport, setSport] = useState<Sport>('football');
  const [scope, setScope] = useState<Scope>('everyone');
  const [metricKey, setMetricKey] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [schoolPromptDismissed, setSchoolPromptDismissed] = useState(false);
  const [appliedSchoolDefault, setAppliedSchoolDefault] = useState(false);

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
  const currentMetric = metricsForSport.find((m) => m.key === metricKey) ?? null;

  useEffect(() => {
    if (metricsForSport.length > 0 && !metricsForSport.some((m) => m.key === metricKey)) {
      setMetricKey(metricsForSport[0].key);
    }
  }, [metricsForSport, metricKey]);

  const boardQ = useQuery({
    queryKey: ['leaderboard', sport, metricKey, scope, verifiedOnly],
    enabled: !!metricKey,
    queryFn: async (): Promise<LbRow[]> => {
      const { data, error } = await supabase.rpc('leaderboard', {
        p_sport: sport,
        p_metric_key: metricKey,
        p_scope: scope,
        p_only_verified: verifiedOnly,
        p_limit: 100,
      });
      if (error) throw error;
      return (data as LbRow[]) ?? [];
    },
  });

  const pctQ = useQuery({
    queryKey: ['percentile', sport, metricKey, scope],
    enabled: !!metricKey,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase.rpc('my_percentile', {
        p_sport: sport,
        p_metric_key: metricKey,
        p_scope: scope,
      });
      if (error) throw error;
      return (data as number | null) ?? null;
    },
  });

  const rows = boardQ.data ?? [];
  const scopeMeta = SCOPES.find((s) => s.key === scope)!;
  const pct = pctQ.data;
  const unit = currentMetric?.unit ?? null;

  // Find me + my closest rival in the board. The rival is whoever sits one
  // rank above me (since we render highest-first that's index myIdx - 1).
  const myIdx = myId ? rows.findIndex((r) => r.profile_id === myId) : -1;
  const me = myIdx >= 0 ? rows[myIdx] : null;
  const rival = myIdx > 0 ? rows[myIdx - 1] : null;

  // Top 3 = podium. Everyone else renders as standard rows.
  const podium = rows.slice(0, 3);
  const restRaw = rows.slice(3);
  // Drop my row from the body if it's in the podium or in `rest` — we re-pin
  // it at the bottom so it's always visible.
  const rest = me ? restRaw.filter((r) => r.profile_id !== myId) : restRaw;
  const pinnedMe = me && myIdx >= 3 ? me : null;

  const showSchoolPrompt =
    !hasSchool && !schoolPromptDismissed && scope === 'everyone';

  const header = (
    <View style={{ paddingTop: space[5] }}>
      {/* Masthead */}
      <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space[5] }}>
        <MicroLabel>LEADERBOARDS</MicroLabel>
        <Txt
          variant="display3"
          weight="extrabold"
          accessibilityRole="header"
          style={{ marginTop: space[2] }}
        >
          Boards
        </Txt>
        {currentMetric ? (
          <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
            {SPORT_LABELS[sport]} · {currentMetric.label}
            {currentMetric.unit ? ` (${currentMetric.unit})` : ''}
          </Txt>
        ) : null}
      </View>

      {/* Sport rail — SportChip horizontal scroller. The trailing padding lets
          the last chip half-peek at the screen edge, signalling "scroll me". */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingRight: SCREEN_PADDING + space[8],
          gap: space[2],
        }}
        style={{ flexGrow: 0 }}
      >
        {SPORTS.map((s) => (
          <SportChip
            key={s}
            glyph={SPORT_GLYPHS[s] ?? '•'}
            label={SPORT_LABELS[s]}
            active={s === sport}
            onPress={() => setSport(s)}
          />
        ))}
      </ScrollView>

      {/* Scope = Segmented control. */}
      <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space[4] }}>
        <Segmented
          options={SCOPES.map((s) => ({ key: s.key, label: s.label }))}
          value={scope}
          onChange={(next) => {
            // If the user has no school, flipping to school/nearby will give an
            // empty board — fine, the EmptyState below will route them to add
            // a school. We never block the tap.
            setScope(next);
          }}
        />
      </View>

      {/* Dismissible inline "Add your school" prompt — guides, never gates. */}
      {showSchoolPrompt ? (
        <View style={{ paddingHorizontal: SCREEN_PADDING, marginTop: space[3] }}>
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
            <AppIcon name="Target" size={16} tone="ember" />
            <Pressable
              onPress={() => router.push('/(tabs)/you?edit=1' as never)}
              style={{ flex: 1 }}
              accessibilityRole="link"
              accessibilityLabel="Add your school to rank locally"
            >
              <Txt variant="bodySm" weight="semibold">
                Add your school to rank locally →
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => setSchoolPromptDismissed(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <AppIcon name="X" size={16} tone="ash" />
            </Pressable>
          </Card>
        </View>
      ) : null}

      {/* Metric chips — narrowed to the current sport. */}
      {metricsForSport.length > 0 && (
        <View style={{ marginTop: space[4] }}>
          <TabPill
            items={metricsForSport.map((m) => m.label)}
            active={currentMetric?.label ?? ''}
            onChange={(label) => {
              const next = metricsForSport.find((m) => m.label === label);
              if (next) setMetricKey(next.key);
            }}
          />
        </View>
      )}

      {/* Above-the-fold info cards: Your rank + Closest rival.
          Movers card is intentionally deferred until the RPC ships weekly
          delta data — adding a fake card here would lie to users. */}
      {(pct != null || rival) ? (
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            marginTop: space[4],
            flexDirection: 'row',
            gap: space[3],
          }}
        >
          {pct != null ? (
            <Card tone="surface" style={{ flex: 1, padding: space[3] }}>
              <MicroLabel>YOUR RANK</MicroLabel>
              <View style={{ marginTop: space[2] }}>
                <Score value={`TOP ${pct}%`} size="md" tone="ember" />
              </View>
              <Txt variant="micro" tone="ash" style={{ marginTop: space[1] }}>
                {scopeMeta.phrase}
              </Txt>
            </Card>
          ) : null}
          {rival ? (
            <Card tone="surface" style={{ flex: 1, padding: space[3] }}>
              <MicroLabel>CLOSEST RIVAL</MicroLabel>
              <Txt
                variant="bodyLg"
                weight="bold"
                numberOfLines={1}
                style={{ marginTop: space[2] }}
              >
                @{rival.handle}
              </Txt>
              <Txt variant="micro" tone="ash" style={{ marginTop: space[1] }}>
                {formatStatValue(rival.value, unit)}
                {unit ? ` ${unit.toUpperCase()}` : ''} · #{rival.rank}
              </Txt>
            </Card>
          ) : null}
        </View>
      ) : null}

      {/* Verified-only toggle */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          marginTop: space[4],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          minHeight: 44,
        }}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setVerifiedOnly((v) => !v);
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: verifiedOnly }}
          accessibilityLabel="Show verified marks only"
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44 }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: colors.ink,
              backgroundColor: verifiedOnly ? colors.ink : 'transparent',
            }}
          />
          <MicroLabel tone="ink">VERIFIED ONLY</MicroLabel>
        </Pressable>
      </View>

      {/* Podium for top 3 — visual landing block. */}
      {podium.length > 0 ? (
        <View style={{ marginTop: space[4] }}>
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: space[3],
            }}
          >
            {[1, 0, 2].map((idx) => {
              const r = podium[idx];
              if (!r) return <View key={idx} style={{ flex: 1 }} />;
              const isFirst = idx === 0;
              return (
                <Pressable
                  key={r.profile_id}
                  onPress={() => router.push(`/player/${r.profile_id}` as never)}
                  style={{ flex: 1, alignItems: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel={`Rank ${r.rank} @${r.handle}`}
                >
                  <Score
                    value={`#${r.rank}`}
                    size="sm"
                    tone={isFirst ? 'ember' : 'ash'}
                  />
                  <Txt
                    variant="bodySm"
                    weight={isFirst ? 'bold' : 'semibold'}
                    numberOfLines={1}
                    style={{ marginTop: space[1] }}
                  >
                    @{r.handle}
                  </Txt>
                  <View style={{ marginTop: space[1] }}>
                    <Score
                      value={formatStatValue(r.value, unit)}
                      size={isFirst ? 'md' : 'sm'}
                      tone={isFirst ? 'ember' : 'ink'}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <HairlineRule style={{ marginTop: space[4] }} />

      {/* Sticky column header — Strava-style RANK / ATHLETE / VALUE. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SCREEN_PADDING,
          paddingVertical: space[2],
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ width: 36 }}>
          <MicroLabel>RANK</MicroLabel>
        </View>
        <View style={{ flex: 1, paddingHorizontal: space[3] }}>
          <MicroLabel>ATHLETE</MicroLabel>
        </View>
        <View style={{ minWidth: 84, alignItems: 'flex-end' }}>
          <MicroLabel>{unit ? unit.toUpperCase() : 'VALUE'}</MicroLabel>
        </View>
      </View>
      <HairlineRule />
    </View>
  );

  const renderRow = ({ item }: { item: LbRow }) => {
    const data = toRowData(item);
    data.value = formatStatValue(item.value, unit);
    return (
      <LeaderboardRow
        row={data}
        unit={unit}
        isCurrentUser={item.profile_id === myId}
        onPress={() => router.push(`/player/${item.profile_id}` as never)}
      />
    );
  };

  const pinned = pinnedMe ? (
    <View>
      <HairlineRule />
      <View style={{ backgroundColor: colors.surface, paddingVertical: space[1] }}>
        <MicroLabel style={{ paddingHorizontal: SCREEN_PADDING }}>YOU</MicroLabel>
      </View>
      <HairlineRule />
      {(() => {
        const data = toRowData(pinnedMe);
        data.value = formatStatValue(pinnedMe.value, unit);
        return (
          <LeaderboardRow
            row={data}
            unit={unit}
            isCurrentUser
            onPress={() => router.push(`/player/${pinnedMe.profile_id}` as never)}
          />
        );
      })()}
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <FlashList
        data={rest}
        keyExtractor={(item) => item.profile_id}
        ListHeaderComponent={header}
        renderItem={renderRow}
        ItemSeparatorComponent={() => <HairlineRule />}
        ListFooterComponent={pinned}
        ListEmptyComponent={
          !boardQ.isLoading ? (
            verifiedOnly ? (
              <EmptyState
                icon="Trophy"
                title="No verified marks yet."
                body="Turn off verified-only to see self-reported marks while teammates co-sign."
                ctaLabel="SHOW ALL MARKS"
                tone="soft"
                onPress={() => setVerifiedOnly(false)}
              />
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
            )
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
