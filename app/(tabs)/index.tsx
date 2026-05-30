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
import { AppIcon } from '../../components/primitives/AppIcon';
import { Card } from '../../components/primitives/Card';
import { Score } from '../../components/motion/Score';
import { TabPill } from '../../components/composite/TabPill';
import { AvatarMeta } from '../../components/composite/AvatarMeta';
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

function LeaderboardRow({
  row,
  unit,
  onPress,
}: {
  row: LbRow;
  unit: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  // Strava-style top-rank highlight: only the #1 row gets the ember accent on
  // the value (one accent per screen at any given moment).
  const accent = row.rank === 1;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${row.rank}, @${row.handle}, ${formatStatValue(row.value, unit)} ${unit ?? ''}, ${row.verified ? 'verified' : 'unverified'}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SCREEN_PADDING,
        minHeight: 64,
        backgroundColor: pressed ? colors.surface : colors.paper,
      })}
    >
      {/* Rank — fixed width so value/length never shifts the row. */}
      <View style={{ width: 36, alignItems: 'flex-start' }}>
        <Score value={`${row.rank}`} size="md" tone={accent ? 'ember' : 'ink'} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: space[3] }}>
        <AvatarMeta
          handle={row.handle}
          meta={row.school_name ?? undefined}
          size="sm"
        />
      </View>

      {/* Value + the monochrome verified/unverified badge — the mark is the
          differentiator now that unverified marks also rank. */}
      <View style={{ alignItems: 'flex-end', minWidth: 84 }}>
        <Score
          value={formatStatValue(row.value, unit)}
          size="md"
          tone={accent ? 'ember' : 'ink'}
        />
        <View style={{ marginTop: space[1] }}>
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
    <View style={{ paddingTop: space[5] }}>
      {/* Masthead — minimal Strava ranked-segment title. */}
      <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space[5] }}>
        <MicroLabel>LEADERBOARDS</MicroLabel>
        <Txt variant="display3" weight="extrabold" accessibilityRole="header" style={{ marginTop: space[2] }}>
          Boards
        </Txt>
        {currentMetric ? (
          <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
            {SPORT_LABELS[sport]} · {currentMetric.label}
            {currentMetric.unit ? ` (${currentMetric.unit})` : ''}
          </Txt>
        ) : null}
      </View>

      {/* Sport pills — primary filter. */}
      <TabPill
        items={SPORTS.map((s) => SPORT_LABELS[s])}
        active={SPORT_LABELS[sport]}
        onChange={(label) => {
          const next = SPORTS.find((s) => SPORT_LABELS[s] === label);
          if (next) setSport(next);
        }}
      />

      {/* Scope pills — Global / School / Nearby. */}
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

      {/* Metric chips — narrowed to the current sport. */}
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

      {/* "You are here" capsule + verified toggle.
          The capsule is the only ember accent in the header; the toggle stays
          neutral so the percentile pulls the eye. */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          marginTop: space[4],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space[3],
          minHeight: 44,
        }}
      >
        {pct != null ? (
          <Card
            tone="surface"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[2],
              paddingHorizontal: space[3],
              paddingVertical: space[2],
              borderRadius: 999,
            }}
          >
            <AppIcon name="Trophy" size={14} tone="ember" />
            <MicroLabel tone="ash">YOU</MicroLabel>
            <Score value={`TOP ${pct}%`} size="sm" tone="ember" />
            <MicroLabel tone="ash">{scopeMeta.phrase}</MicroLabel>
          </Card>
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
              borderRadius: 4,
              borderWidth: 1,
              borderColor: colors.ink,
              backgroundColor: verifiedOnly ? colors.ink : 'transparent',
            }}
          />
          <MicroLabel tone="ink">VERIFIED ONLY</MicroLabel>
        </Pressable>
      </View>

      {/* Column header row — Strava-style RANK / ATHLETE / VALUE. */}
      <HairlineRule style={{ marginTop: space[4] }} />
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
          <MicroLabel>{currentMetric?.unit ? currentMetric.unit.toUpperCase() : 'VALUE'}</MicroLabel>
        </View>
      </View>
      <HairlineRule />
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
            <View
              style={{
                paddingHorizontal: SCREEN_PADDING,
                paddingVertical: space[9],
                alignItems: 'center',
              }}
            >
              <View style={{ marginBottom: space[4] }}>
                <AppIcon name="Trophy" size={48} tone="ash" />
              </View>
              {needsSchool ? (
                <>
                  <Txt
                    variant="display4"
                    weight="bold"
                    style={{ textAlign: 'center' }}
                  >
                    Pick your school to see this board.
                  </Txt>
                  <Txt
                    variant="body"
                    tone="ash"
                    style={{ marginTop: space[3], textAlign: 'center' }}
                  >
                    {scope === 'nearby'
                      ? 'Nearby pulls from schools around yours.'
                      : 'School scope ranks the kids you actually line up against.'}
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
                  <Txt
                    variant="display4"
                    weight="bold"
                    style={{ textAlign: 'center' }}
                  >
                    No verified marks yet.
                  </Txt>
                  <Txt
                    variant="body"
                    tone="ash"
                    style={{ marginTop: space[3], textAlign: 'center' }}
                  >
                    Turn off verified-only to see self-reported marks while teammates co-sign.
                  </Txt>
                </>
              ) : (
                <>
                  <Txt
                    variant="display4"
                    weight="bold"
                    style={{ textAlign: 'center' }}
                  >
                    Be the first name on this board.
                  </Txt>
                  <Txt
                    variant="body"
                    tone="ash"
                    style={{ marginTop: space[3], textAlign: 'center' }}
                  >
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
