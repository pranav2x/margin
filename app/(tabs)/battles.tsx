import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { Card } from '../../components/primitives/Card';
import { StatBlock, StatBlockRow } from '../../components/primitives/StatBlock';
import { AppIcon } from '../../components/primitives/AppIcon';
import { AvatarMeta } from '../../components/composite/AvatarMeta';
import { Score } from '../../components/motion/Score';
import { VerifiedMark } from '../../components/composite/StatLine';
import { BattleShareCard } from '../../components/composite/BattleShareCard';
import {
  SPORT_LABELS,
  formatStatValue,
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
import { useTheme, space, SCREEN_PADDING, type, fonts } from '../../theme';
import { recordActivity } from '../../lib/hooks/useStreak';
import { useNearbySchools } from '../../lib/hooks/useNearbySchools';

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

export default function BattlesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const queryClient = useQueryClient();

  const meQ = useMyProfile();
  const me = meQ.data;
  const mySport = me?.primary_sport ?? null;

  const myStatsQ = useMyStats();
  const myStats = useMemo(() => myStatsQ.data ?? [], [myStatsQ.data]);

  const [query, setQuery] = useState('');
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const searchQ = useOpponentSearch(query, mySport, me?.id);
  const schoolQ = useSchoolOpponents(me?.school_id ?? null, mySport, me?.id);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      // Filing (sharing) a battle is a core-loop action — advance the streak,
      // fire-and-forget so it counts even if the OS share sheet is dismissed.
      void recordActivity(queryClient);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this battle' });
      }
    } catch {
      // Capture/share unavailable — no-op.
    }
  };

  // ── Selection view ────────────────────────────────────────
  if (!opponentId) {
    const searchResults = searchQ.data ?? [];
    const schoolResults = schoolQ.data ?? [];
    const nearbyResults = nearbyOpponentsQ.data ?? [];
    const isSearching = query.trim().length >= 2;
    const hasAnyDiscovery = schoolResults.length > 0 || nearbyResults.length > 0;

    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        >
          {/* Masthead — title + sport line. No orange in the header; the
              accent waits for a winning comparison row. */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
            <MicroLabel>HEAD TO HEAD</MicroLabel>
            <Txt
              variant="display3"
              weight="bold"
              accessibilityRole="header"
              style={{ marginTop: space[2] }}
            >
              Battles
            </Txt>
            <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[2] }}>
              Line up your stats against another athlete in {sportLabel ?? 'your sport'}.
            </Txt>
          </View>

          {!mySport ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8], alignItems: 'center' }}>
              <View style={{ marginBottom: space[4] }}>
                <AppIcon name="Swords" size={48} tone="ash" />
              </View>
              <Txt variant="display4" weight="bold" style={{ textAlign: 'center' }}>
                A battle needs a sport.
              </Txt>
              <Txt variant="body" tone="ash" style={{ marginTop: space[3], textAlign: 'center' }}>
                Pick your primary sport so we can line up like-for-like marks.
              </Txt>
              <View style={{ marginTop: space[5], alignSelf: 'stretch' }}>
                <PrimaryButton
                  label="SET YOUR SPORT"
                  full
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push('/(tabs)/you?edit=1' as never);
                  }}
                />
              </View>
            </View>
          ) : (
            <>
              {/* Search input — Strava-style pill: rounded Card with a Search
                  icon prefix. The query drives the TRENDING section below. */}
              <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
                <Card
                  tone="surface"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space[3],
                    paddingHorizontal: space[4],
                    paddingVertical: space[3],
                    borderRadius: 999,
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
                </Card>
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
                  rows to show. Centered Swords + a directive headline. */}
              {!isSearching && !hasAnyDiscovery ? (
                <View
                  style={{
                    paddingHorizontal: SCREEN_PADDING,
                    paddingVertical: space[9],
                    alignItems: 'center',
                  }}
                >
                  <View style={{ marginBottom: space[4] }}>
                    <AppIcon name="Swords" size={48} tone="ash" />
                  </View>
                  <Txt variant="display4" weight="bold" style={{ textAlign: 'center' }}>
                    Find someone to battle.
                  </Txt>
                </View>
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
              <Avatar uri={me?.avatar_url ?? undefined} size={88} />
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
              <Avatar uri={opp?.avatar_url ?? undefined} size={88} />
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
