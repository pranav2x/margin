import { useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { Score } from '../../components/motion/Score';
import { VerifiedMark } from '../../components/composite/StatLine';
import { BattleShareCard } from '../../components/composite/BattleShareCard';
import {
  SPORT_LABELS,
  formatStatValue,
  useMyProfile,
  useMyStats,
  useOpponentSearch,
  usePublicProfile,
  usePublicStats,
  useSchoolOpponents,
  type MetricRow,
  type MyProfile,
  type PlayerStat,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import { useTheme, space, SCREEN_PADDING, fonts } from '../../theme';

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

function OpponentRow({ p, onPress }: { p: MyProfile; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Battle @${p.handle}`}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingVertical: space[4], minHeight: 56 }}
    >
      <Avatar uri={p.avatar_url ?? undefined} size={44} />
      <View style={{ flex: 1, marginLeft: space[4] }}>
        <Txt variant="bodyLg">@{p.handle}</Txt>
        {p.school?.name ? <MicroLabel style={{ marginTop: 2 }}>{p.school.name}</MicroLabel> : null}
      </View>
    </Pressable>
  );
}

function ComparisonRow({ row, showWinner, verified }: { row: CompRow; showWinner: boolean; verified?: boolean }) {
  const { colors } = useTheme();
  const unit = row.metric.unit;
  // The winning side is a sanctioned ember moment — the one accent marks the
  // result. The losing side recedes to ash; ties stay monochrome.
  const meWins = showWinner && row.winner === 'me';
  const oppWins = showWinner && row.winner === 'opp';
  return (
    <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[4] }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 76, alignItems: 'flex-start' }}>
          <Score
            value={formatStatValue(row.mine.value, unit)}
            size="sm"
            tone={meWins ? 'ink' : 'ash'}
            style={meWins ? { color: colors.ember } : undefined}
          />
          {meWins && <MicroLabel style={{ marginTop: space[1], color: colors.ember }}>WINS</MicroLabel>}
        </View>

        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: space[2] }}>
          <Txt variant="bodySm" style={{ textAlign: 'center' }}>{row.metric.label}</Txt>
          {unit ? <MicroLabel style={{ marginTop: 2 }}>{unit}</MicroLabel> : null}
          {verified && (
            <View style={{ marginTop: space[2], alignItems: 'center' }}>
              <VerifiedMark verified />
            </View>
          )}
          {showWinner && row.winner === 'tie' && <MicroLabel tone="ink" style={{ marginTop: space[1] }}>TIE</MicroLabel>}
        </View>

        <View style={{ width: 76, alignItems: 'flex-end' }}>
          <Score
            value={formatStatValue(row.theirs.value, unit)}
            size="sm"
            tone={oppWins ? 'ink' : 'ash'}
            style={oppWins ? { color: colors.ember } : undefined}
          />
          {oppWins && <MicroLabel style={{ marginTop: space[1], color: colors.ember }}>WINS</MicroLabel>}
        </View>
      </View>
    </View>
  );
}

export default function BattlesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const meQ = useMyProfile();
  const me = meQ.data;
  const mySport = me?.primary_sport ?? null;

  const myStatsQ = useMyStats();
  const myStats = useMemo(() => myStatsQ.data ?? [], [myStatsQ.data]);

  const [query, setQuery] = useState('');
  const [opponentId, setOpponentId] = useState<string | null>(null);

  const searchQ = useOpponentSearch(query, mySport, me?.id);
  const schoolQ = useSchoolOpponents(me?.school_id ?? null, mySport, me?.id);

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
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this battle' });
      }
    } catch {
      // Capture/share unavailable — no-op.
    }
  };

  // ── Selection view ────────────────────────────────────────
  if (!opponentId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        >
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
            <MicroLabel>HEAD TO HEAD</MicroLabel>
            <Txt variant="display1" accessibilityRole="header" style={{ marginTop: space[2], fontSize: 56, lineHeight: 60 }}>
              Battles
            </Txt>
            <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[4], lineHeight: 26 }}>
              Line up your stats against another athlete in {sportLabel ?? 'your sport'}.
            </Txt>
          </View>

          {!mySport ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
              <Txt variant="display4" italic tone="ash" style={{ fontFamily: 'InstrumentSerifItalic' }}>
                Set your primary sport on the You tab to battle.
              </Txt>
            </View>
          ) : (
            <>
              <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
                <MicroLabel>SEARCH BY HANDLE</MicroLabel>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="@handle"
                  placeholderTextColor={colors.ash}
                  autoCapitalize="none"
                  autoCorrect={false}
                  allowFontScaling={false}
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 28,
                    lineHeight: 32,
                    color: colors.ink,
                    paddingVertical: space[2],
                  }}
                />
                <HairlineRule />
              </View>

              {searchQ.isFetching && (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[4] }}>
                  <ActivityIndicator color={colors.ink} />
                </View>
              )}

              {query.trim().length >= 2 && (searchQ.data ?? []).length === 0 && !searchQ.isFetching && (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
                  <Txt variant="bodyLg" tone="ash" italic style={{ fontFamily: 'InstrumentSerifItalic' }}>
                    No {sportLabel?.toLowerCase()} athletes by that handle.
                  </Txt>
                </View>
              )}

              {(searchQ.data ?? []).map((p, i) => (
                <View key={p.id}>
                  {i === 0 && <HairlineRule style={{ marginTop: space[3] }} />}
                  <OpponentRow p={p} onPress={() => pick(p.id)} />
                  <HairlineRule />
                </View>
              ))}

              <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8], paddingBottom: space[2] }}>
                <MicroLabel>AT YOUR SCHOOL</MicroLabel>
              </View>
              <HairlineRule />
              {(schoolQ.data ?? []).length === 0 ? (
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                  <Txt variant="bodyLg" tone="ash">No teammates on the board yet.</Txt>
                </View>
              ) : (
                (schoolQ.data ?? []).map((p, i) => (
                  <View key={p.id}>
                    <OpponentRow p={p} onPress={() => pick(p.id)} />
                    {i < (schoolQ.data ?? []).length - 1 && <HairlineRule />}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Comparison view ───────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <View style={{ height: 56, paddingHorizontal: SCREEN_PADDING, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => { Haptics.selectionAsync(); setOpponentId(null); }} hitSlop={12} accessibilityRole="button">
          <MicroLabel tone="ink">CHANGE OPPONENT</MicroLabel>
        </Pressable>
        <Pressable onPress={() => router.push(`/player/${opponentId}` as never)} hitSlop={12} accessibilityRole="button">
          <MicroLabel tone="ink">VIEW PROFILE</MicroLabel>
        </Pressable>
      </View>
      <HairlineRule />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        {/* Tally header — one elevation step up (paper → surface). The tonal
            step alone sets the score band off from the list; no new borders. */}
        <View style={{ backgroundColor: colors.surface, paddingBottom: space[6] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Avatar uri={me?.avatar_url ?? undefined} size={56} />
              <Txt variant="bodySm" numberOfLines={1} style={{ marginTop: space[2], fontFamily: 'GeistMono' }}>@{me?.handle ?? 'you'}</Txt>
            </View>
            <View style={{ alignItems: 'center', paddingHorizontal: space[4] }}>
              <Score value={`${myWins}–${oppWins}`} size="xl" />
              <MicroLabel style={{ marginTop: space[2] }}>{ties > 0 ? `${ties} TIE${ties > 1 ? 'S' : ''}` : 'ALL MARKS'}</MicroLabel>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Avatar uri={opp?.avatar_url ?? undefined} size={56} />
              <Txt variant="bodySm" numberOfLines={1} style={{ marginTop: space[2], fontFamily: 'GeistMono' }}>@{opp?.handle ?? ''}</Txt>
            </View>
          </View>

          {/* Verified-only sub-tally (the subset both sides have peer-verified). */}
          {verifiedRows.length > 0 && (
            <View style={{ alignItems: 'center', paddingTop: space[3] }}>
              <MicroLabel>{`VERIFIED ONLY · ${vMyWins}–${vOppWins}`}</MicroLabel>
            </View>
          )}
        </View>

        {oppProfileQ.isLoading || oppStatsQ.isLoading ? (
          <View style={{ paddingVertical: space[8], alignItems: 'center' }}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : comparison.length === 0 ? (
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <Txt variant="display4" italic tone="ash" style={{ fontFamily: 'InstrumentSerifItalic' }}>
              No shared metrics yet.
            </Txt>
            <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
              You both need a stat on the same metric to compare.
            </Txt>
          </View>
        ) : (
          <>
            {/* Every plausible shared mark counts. Rows verified on both sides
                are badged; the sub-tally above tracks the verified-only score. */}
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8], paddingBottom: space[2] }}>
              <MicroLabel>ALL MARKS · BOTH IN RANGE</MicroLabel>
            </View>
            <HairlineRule />
            {countedRows.length === 0 ? (
              <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
                <Txt variant="bodyLg" tone="ash">No in-range marks on the same metric yet.</Txt>
              </View>
            ) : (
              countedRows.map((row, i) => (
                <View key={row.metric.id}>
                  <ComparisonRow row={row} showWinner verified={row.bothVerified} />
                  {i < countedRows.length - 1 && <HairlineRule />}
                </View>
              ))
            )}

            {/* Share card */}
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
              <PrimaryButton label="SHARE BATTLE" variant="ghost" full onPress={share} style={{ marginTop: space[4] }} />
            </View>

            {/* Not counted: a mark is outside its plausible range on one or both
                sides, so it stays out of the tally. */}
            {notCounted.length > 0 && (
              <>
                <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8], paddingBottom: space[2] }}>
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
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
