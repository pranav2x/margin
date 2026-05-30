import { useEffect, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Score } from '../../components/motion/Score';
import { TabPill } from '../../components/composite/TabPill';
import { VerifiedMark } from '../../components/composite/StatLine';
import { supabase } from '../../lib/supabase';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
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
  { key: 'school', label: 'My School', phrase: 'AT YOUR SCHOOL' },
  { key: 'nearby', label: 'Nearby', phrase: 'NEARBY' },
  { key: 'everyone', label: 'Everyone', phrase: 'EVERYWHERE' },
] as const;
type Scope = (typeof SCOPES)[number]['key'];

function LeaderboardRow({ row, unit, onPress }: { row: LbRow; unit: string | null; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${row.rank}, @${row.handle}, ${formatStatValue(row.value, unit)} ${unit ?? ''}, ${row.verified ? 'verified' : 'unverified'}`}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingVertical: space[4], minHeight: 56 }}
    >
      {/* Rank — fixed width so value/length never shifts the row. */}
      <View style={{ width: 40, alignItems: 'flex-start' }}>
        <Score value={`${row.rank}`} size="sm" />
      </View>

      <View style={{ flex: 1, paddingHorizontal: space[3] }}>
        <Txt variant="bodyLg">@{row.handle}</Txt>
        {row.school_name ? <MicroLabel style={{ marginTop: 2 }}>{row.school_name}</MicroLabel> : null}
      </View>

      {/* Value + the monochrome verified/unverified badge — the mark is the
          differentiator now that unverified marks also rank. */}
      <View style={{ alignItems: 'flex-end', minWidth: 76 }}>
        <Score value={formatStatValue(row.value, unit)} size="sm" />
        <View style={{ marginTop: space[2] }}>
          <VerifiedMark verified={row.verified} />
        </View>
      </View>
    </Pressable>
  );
}

export default function BoardsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sport, setSport] = useState<Sport>('football');
  const [scope, setScope] = useState<Scope>('school');
  const [metricKey, setMetricKey] = useState<string>('');
  // Default view = all plausible marks. The toggle narrows to verified only.
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const catalogQ = useMetricCatalog();
  const profileQ = useMyProfile();
  const needsSchool = (scope === 'school' || scope === 'nearby') && !profileQ.data?.school_id;
  const metricsForSport = useMemo(
    () => (catalogQ.data ?? []).filter((m) => m.sport === sport).sort((a, b) => a.sort_order - b.sort_order),
    [catalogQ.data, sport],
  );
  const currentMetric = metricsForSport.find((m) => m.key === metricKey) ?? null;

  // Keep a valid metric selected for the chosen sport.
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

  const header = (
    <View style={{ paddingTop: space[6] }}>
      <View style={{ paddingHorizontal: SCREEN_PADDING }}>
        <MicroLabel>LEADERBOARDS</MicroLabel>
        <Txt variant="display1" accessibilityRole="header" style={{ marginTop: space[2], fontSize: 56, lineHeight: 60 }}>
          Boards
        </Txt>
      </View>

      <View style={{ marginTop: space[6] }}>
        <TabPill
          items={SPORTS.map((s) => SPORT_LABELS[s])}
          active={SPORT_LABELS[sport]}
          onChange={(label) => {
            const next = SPORTS.find((s) => SPORT_LABELS[s] === label);
            if (next) setSport(next);
          }}
        />
      </View>

      <View style={{ marginTop: space[1] }}>
        <TabPill
          items={SCOPES.map((s) => s.label)}
          active={scopeMeta.label}
          onChange={(label) => {
            const next = SCOPES.find((s) => s.label === label);
            if (next) setScope(next.key);
          }}
        />
      </View>

      <HairlineRule style={{ marginTop: space[3] }} />

      {metricsForSport.length > 0 && (
        <View style={{ marginTop: space[3] }}>
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

      {/* Percentile (positive phrasing only) + show-unverified toggle */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          marginTop: space[4],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 44,
        }}
      >
        {pct != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
            <MicroLabel>TOP</MicroLabel>
            <Score value={`${pct}%`} size="sm" />
            <MicroLabel>{scopeMeta.phrase}</MicroLabel>
          </View>
        ) : (
          <View />
        )}

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
              borderWidth: 1,
              borderColor: colors.ink,
              backgroundColor: verifiedOnly ? colors.ink : 'transparent',
            }}
          />
          <MicroLabel tone="ink">VERIFIED ONLY</MicroLabel>
        </Pressable>
      </View>

      <HairlineRule style={{ marginTop: space[4] }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <FlashList
        data={rows}
        keyExtractor={(item) => item.profile_id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <LeaderboardRow
            row={item}
            unit={currentMetric?.unit ?? null}
            onPress={() => router.push(`/player/${item.profile_id}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <HairlineRule />}
        ListEmptyComponent={
          !boardQ.isLoading ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[10], alignItems: 'flex-start' }}>
              {needsSchool ? (
                <>
                  <Txt variant="display4" italic tone="ash" style={{ fontSize: 20, fontFamily: 'InstrumentSerifItalic' }}>
                    Pick your school to see this board.
                  </Txt>
                  <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
                    {scope === 'nearby' ? 'Nearby pulls from schools around yours.' : 'School scope ranks the kids you actually line up against.'}
                  </Txt>
                  <View style={{ marginTop: space[5], alignSelf: 'stretch' }}>
                    <PrimaryButton
                      label="PICK YOUR SCHOOL"
                      full
                      onPress={() => router.push('/(tabs)/you?edit=1' as never)}
                    />
                  </View>
                </>
              ) : verifiedOnly ? (
                <>
                  <Txt variant="display4" italic tone="ash" style={{ fontSize: 20, fontFamily: 'InstrumentSerifItalic' }}>
                    No verified marks yet.
                  </Txt>
                  <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
                    Turn off verified-only to see self-reported marks while teammates co-sign.
                  </Txt>
                </>
              ) : (
                <>
                  <Txt variant="display4" italic tone="ash" style={{ fontSize: 20, fontFamily: 'InstrumentSerifItalic' }}>
                    Be the first name on this board.
                  </Txt>
                  <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
                    Drop a mark on the You tab — it lands here the second you save.
                  </Txt>
                  <View style={{ marginTop: space[5], alignSelf: 'stretch' }}>
                    <PrimaryButton
                      label="ADD YOUR FIRST MARK"
                      full
                      onPress={() => router.push('/(tabs)/you' as never)}
                    />
                  </View>
                </>
              )}
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
