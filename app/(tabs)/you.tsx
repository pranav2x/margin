import { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import { StatBlock, StatBlockRow } from '../../components/primitives/StatBlock';
import { Card } from '../../components/primitives/Card';
import { StatLine } from '../../components/composite/StatLine';
import { ShareCard, type HeadlineStat } from '../../components/composite/ShareCard';
import { StatEntrySheet, type StatEntrySheetRef } from '../../components/composite/StatEntrySheet';
import { ProfileEditSheet, type ProfileEditSheetRef } from '../../components/composite/ProfileEditSheet';
import { StreakBlock } from '../../components/composite/StreakBlock';
import { StreakMilestoneCard } from '../../components/composite/StreakMilestoneCard';
import {
  LeaderboardRow,
  type LeaderboardRowData,
} from '../../components/composite/LeaderboardRow';
import { VerifiedBadge, tierOf, type VerifiedTier } from '../../components/primitives/VerifiedBadge';
import { AppIcon } from '../../components/primitives/AppIcon';
import {
  SPORTS,
  SPORT_LABELS,
  formatStatValue,
  useMetricCatalog,
  useMyProfile,
  useMyStats,
  type PlayerStat,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import { useStreak } from '../../lib/hooks/useStreak';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import { signOut } from '../../lib/auth';
import { useCreateSheetStore } from '../../state/createSheet';

export default function YouScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();

  const profileQ = useMyProfile();
  const statsQ = useMyStats();
  const catalogQ = useMetricCatalog();
  const streakQ = useStreak();

  const sheetRef = useRef<StatEntrySheetRef>(null);
  const editRef = useRef<ProfileEditSheetRef>(null);
  const cardRef = useRef<View>(null);
  const milestoneRef = useRef<View>(null);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Other tabs route here with `?edit=1` when the user has a missing profile
  // field that blocks them (no sport, no school). Open the editor once on land.
  const params = useLocalSearchParams<{ edit?: string }>();
  useEffect(() => {
    if (params.edit === '1') {
      const t = setTimeout(() => editRef.current?.present(), 250);
      return () => clearTimeout(t);
    }
  }, [params.edit]);

  // Register the StatEntrySheet trigger so the BottomTabBar's create-button
  // "Log stat" row can open it. Cleared on unmount so a backgrounded screen
  // never claims the handler.
  const setStatEntryHandler = useCreateSheetStore((s) => s.setStatEntryHandler);
  useEffect(() => {
    setStatEntryHandler(() => sheetRef.current?.present());
    return () => setStatEntryHandler(null);
  }, [setStatEntryHandler]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
    } catch (err) {
      setSignOutError(err instanceof Error ? err.message : 'Sign out failed.');
      setIsSigningOut(false);
    }
  };

  const profile = profileQ.data;
  const stats = useMemo(() => statsQ.data ?? [], [statsQ.data]);
  const streak = streakQ.data ?? null;
  // Celebrate the moment a streak lands on a milestone (the card shows that day,
  // then steps back to the normal flame once the count moves past it).
  const milestone = streak && [7, 14, 30].includes(streak.current) ? streak.current : null;

  const grouped = useMemo(() => {
    const map = new Map<string, PlayerStat[]>();
    for (const s of stats) {
      const arr = map.get(s.metric.sport) ?? [];
      arr.push(s);
      map.set(s.metric.sport, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.metric.sort_order - b.metric.sort_order);
    return (SPORTS as readonly string[])
      .filter((s) => map.has(s))
      .map((s) => ({ sport: s as Sport, rows: map.get(s)! }));
  }, [stats]);

  const headline = useMemo(() => {
    const plausible = stats.filter((s) => s.is_plausible !== false);
    plausible.sort(
      (a, b) => Number(b.verified) - Number(a.verified) || a.metric.sort_order - b.metric.sort_order,
    );
    return plausible.slice(0, 2);
  }, [stats]);

  const cardStats: HeadlineStat[] = headline.map((s) => ({
    label: s.metric.label,
    value: formatStatValue(s.value, s.metric.unit),
    unit: s.metric.unit,
    verified: s.verified,
  }));

  const top = headline[0];
  const handle = profile?.handle ?? 'you';
  const sportLabel = profile?.primary_sport ? SPORT_LABELS[profile.primary_sport as Sport] ?? null : null;
  const onSaved = () => queryClient.invalidateQueries({ queryKey: ['my-stats'] });
  const onProfileSaved = () => queryClient.invalidateQueries({ queryKey: ['my-profile'] });

  // Stat hero row — counts that summarise the athlete at a glance.
  // Verified count anchors trust; total marks shows breadth; streak (in ember)
  // carries the one-accent narrative beat.
  const verifiedCount = useMemo(
    () => stats.filter((s) => s.verified && s.is_plausible !== false).length,
    [stats],
  );
  const totalCount = stats.length;
  const streakDays = streak?.current ?? 0;

  // Identity-level tier shown next to the handle. Highest tier the user has
  // earned across any stat — event > video > unverified. Floors to unverified
  // when the profile has no stats yet.
  const identityTier: VerifiedTier = useMemo(() => {
    let best: VerifiedTier = 'unverified';
    for (const s of stats) {
      const t = tierOf(s.verified, s.verification_method);
      if (t === 'event') return 'event';
      if (t === 'video') best = 'video';
    }
    return best;
  }, [stats]);

  // "vs. your school" — three rows of the school leaderboard on the user's
  // primary metric. Uses `isCurrentUser` to highlight the user's row.
  const primaryMetricForSport = useMemo(() => {
    const sport = profile?.primary_sport;
    if (!sport) return null;
    const list = (catalogQ.data ?? [])
      .filter((m) => m.sport === sport)
      .sort((a, b) => a.sort_order - b.sort_order);
    return list[0] ?? null;
  }, [catalogQ.data, profile?.primary_sport]);

  const schoolBoardQ = useQuery({
    queryKey: [
      'profile-vs-school',
      profile?.id ?? null,
      profile?.school_id ?? null,
      profile?.primary_sport ?? null,
      primaryMetricForSport?.key ?? null,
    ],
    enabled:
      !!profile?.id && !!profile?.school_id && !!primaryMetricForSport?.key,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('leaderboard', {
        p_sport: profile!.primary_sport!,
        p_metric_key: primaryMetricForSport!.key,
        p_scope: 'school',
        p_only_verified: false,
        p_limit: 5,
      });
      if (error) throw error;
      return (data as Array<{
        rank: number;
        profile_id: string;
        handle: string;
        school_name: string | null;
        value: number;
        verified: boolean;
        verification_method: string;
      }> | null) ?? [];
    },
  });

  const share = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your card' });
      }
    } catch {
      // Capture/share unavailable (e.g. simulator without share targets) — no-op.
    }
  };

  const shareMilestone = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const uri = await captureRef(milestoneRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your streak' });
      }
    } catch {
      // Capture/share unavailable — no-op.
    }
  };

  if (profileQ.isLoading || catalogQ.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  const metaLine = [profile?.school?.name, profile?.grad_year ? `CLASS OF ${profile.grad_year}` : null, sportLabel?.toUpperCase()]
    .filter(Boolean)
    .join(' · ');

  // Headline stat is the narrative metric the share card already promotes.
  // Render it as the single xl StatBlock in the hero so it earns the ember.
  const headlineValue = top ? formatStatValue(top.value, top.metric.unit) : null;
  const headlineLabel = top
    ? `${top.metric.label.toUpperCase()}${top.metric.unit ? ` · ${top.metric.unit}` : ''}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        >
          {/* Masthead — Strava-faithful: centered avatar, big name, handle,
              meta line, then one compact ghost Edit Profile button. Whitespace
              does the work; no orange in the masthead. */}
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: space[7],
              alignItems: 'center',
            }}
          >
            <Avatar uri={profile?.avatar_url ?? undefined} size={96} />
            <Txt
              variant="display3"
              weight="bold"
              accessibilityRole="header"
              style={{ marginTop: space[4], textAlign: 'center' }}
            >
              {profile?.display_name ?? `@${handle}`}
            </Txt>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[2],
                marginTop: space[1],
              }}
            >
              <Txt
                variant="bodyLg"
                tone="ash"
                weight="semibold"
                style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}
              >
                @{handle}
              </Txt>
              <VerifiedBadge tier={identityTier} />
            </View>
            {metaLine.length > 0 && (
              <Txt
                variant="bodySm"
                tone="ash"
                style={{ marginTop: space[2], textAlign: 'center' }}
              >
                {metaLine}
              </Txt>
            )}

            <View style={{ marginTop: space[5] }}>
              <PrimaryButton
                label="Edit profile"
                variant="ghost"
                size="compact"
                onPress={() => editRef.current?.present()}
              />
            </View>
          </View>

          {/* Headline stat — the single ember moment of the screen. */}
          {headlineValue && headlineLabel ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
              <StatBlock
                value={headlineValue}
                label={headlineLabel}
                size="xl"
                tone="accent"
                align="center"
              />
            </View>
          ) : null}

          {/* Stat hero row — verified marks · streak · total marks. Center
              aligned, hairline dividers between blocks. Streak rides ember to
              keep one stat narrative; the rest stay ink. */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[7] }}>
            <StatBlockRow>
              <StatBlock
                value={verifiedCount}
                label="VERIFIED"
                align="center"
                size="md"
              />
              <StatBlock
                value={streakDays}
                label="DAY STREAK"
                align="center"
                size="md"
                tone={streakDays > 0 ? 'accent' : 'default'}
              />
              <StatBlock
                value={totalCount}
                label="TRACKED"
                align="center"
                size="md"
              />
            </StatBlockRow>
          </View>

          {/* Edition streak — a Card so it reads as its own module, separated
              from the stat lines below. Milestone celebration swaps in the
              shareable card; otherwise the standard StreakBlock. */}
          {milestone ? (
            <MotiView
              from={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 320 }}
              style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}
            >
              <MicroLabel style={{ marginBottom: space[3] }}>EDITION STREAK</MicroLabel>
              <StreakMilestoneCard
                ref={milestoneRef}
                handle={handle}
                days={milestone}
                school={profile?.school?.name ?? null}
                sportLabel={sportLabel}
              />
              <PrimaryButton
                label="Share streak"
                variant="ghost"
                full
                onPress={shareMilestone}
                style={{ marginTop: space[4] }}
              />
            </MotiView>
          ) : streak && streak.current >= 1 ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
              <MicroLabel style={{ marginBottom: space[3] }}>EDITION STREAK</MicroLabel>
              <Card padded>
                <StreakBlock streak={streak} />
              </Card>
            </View>
          ) : null}

          {/* Share card — preserved as the capture target. Sits inside the
              flow with a ghost CTA so the orange stays one beat away. */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <MicroLabel style={{ marginBottom: space[3] }}>SHARE CARD</MicroLabel>
            <ShareCard
              ref={cardRef}
              handle={handle}
              school={profile?.school?.name ?? null}
              sportLabel={sportLabel}
              stats={cardStats}
            />
            <PrimaryButton
              label="Share card"
              variant="ghost"
              full
              onPress={share}
              style={{ marginTop: space[4] }}
            />
          </View>

          {/* Stat lines — grouped per sport. Each group sits under a MicroLabel
              header (e.g. "FOOTBALL") and rows are separated by hairlines only.
              No card wrapper so the typographic grid reads as the structure. */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <MicroLabel>STAT LINES</MicroLabel>
          </View>

          {grouped.length === 0 ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingVertical: space[5] }}>
              <Txt variant="display4" tone="ash" weight="semibold">
                Your board is a blank page.
              </Txt>
              <Txt variant="bodyLg" tone="ash" style={{ marginTop: space[3] }}>
                Add your first mark below — a teammate can co-sign it later.
              </Txt>
            </View>
          ) : (
            <View style={{ paddingTop: space[3] }}>
              {grouped.map((group, gi) => (
                <View key={group.sport}>
                  {gi > 0 && <HairlineRule style={{ marginTop: space[5] }} />}
                  <View
                    style={{
                      paddingHorizontal: SCREEN_PADDING,
                      paddingTop: gi === 0 ? space[2] : space[5],
                      paddingBottom: space[2],
                    }}
                  >
                    <MicroLabel>{SPORT_LABELS[group.sport].toUpperCase()}</MicroLabel>
                  </View>
                  <HairlineRule />
                  {group.rows.map((s, i) => (
                    <View key={s.id}>
                      <StatLine stat={s} onPress={() => sheetRef.current?.present(s)} />
                      {i < group.rows.length - 1 && <HairlineRule />}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* PRs — derived from the user's own stats: the headline pair we
              already promote upstairs. Rendered as small Cards so the row
              reads as receipts, not as more stat lines. */}
          {headline.length > 0 ? (
            <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
              <MicroLabel style={{ marginBottom: space[3] }}>PERSONAL RECORDS</MicroLabel>
              <View style={{ flexDirection: 'row', gap: space[3] }}>
                {headline.map((s) => (
                  <Card key={s.id} tone="surface" style={{ flex: 1, padding: space[3] }}>
                    <MicroLabel>{s.metric.label.toUpperCase()}</MicroLabel>
                    <Txt
                      variant="display4"
                      weight="bold"
                      style={{ marginTop: space[2], fontVariant: ['tabular-nums'] }}
                    >
                      {formatStatValue(s.value, s.metric.unit)}
                    </Txt>
                    <View style={{ marginTop: space[2] }}>
                      <VerifiedBadge tier={tierOf(s.verified, s.verification_method)} />
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {/* vs. your school — three rows of the user's school leaderboard
              on their primary metric, with their own row highlighted. */}
          {profile?.school_id && (schoolBoardQ.data?.length ?? 0) > 0 ? (
            <View style={{ paddingTop: space[8] }}>
              <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space[3] }}>
                <MicroLabel>VS. YOUR SCHOOL</MicroLabel>
                {primaryMetricForSport ? (
                  <Txt variant="bodySm" tone="ash" style={{ marginTop: space[1] }}>
                    {primaryMetricForSport.label}
                    {primaryMetricForSport.unit ? ` (${primaryMetricForSport.unit})` : ''}
                  </Txt>
                ) : null}
              </View>
              <HairlineRule />
              {schoolBoardQ.data!.slice(0, 5).map((r, i, arr) => {
                const data: LeaderboardRowData = {
                  rank: r.rank,
                  handle: r.handle,
                  school: r.school_name,
                  value: formatStatValue(r.value, primaryMetricForSport?.unit ?? null),
                  tier: tierOf(r.verified, r.verification_method),
                };
                return (
                  <View key={r.profile_id}>
                    <LeaderboardRow
                      row={data}
                      unit={primaryMetricForSport?.unit ?? null}
                      isCurrentUser={r.profile_id === profile?.id}
                      onPress={() => router.push(`/player/${r.profile_id}` as never)}
                    />
                    {i < arr.length - 1 ? <HairlineRule /> : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Clips grid — placeholder cells route into the Clips tab. Wave
              2.x replaces these with the user's own uploaded clips once the
              clips table is live. */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <MicroLabel style={{ marginBottom: space[3] }}>CLIPS</MicroLabel>
            <View style={{ flexDirection: 'row', gap: space[2] }}>
              {[0, 1, 2].map((i) => (
                <Pressable
                  key={i}
                  onPress={() => router.push('/(tabs)/clips' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Open clips"
                  style={{
                    flex: 1,
                    aspectRatio: 9 / 16,
                    backgroundColor: colors.surface,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.fog,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppIcon name="Video" size={20} tone="ash" />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Bottom CTA — the only filled ember button on the screen. */}
          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[8] }}>
            <PrimaryButton label="Add a stat" full onPress={() => sheetRef.current?.present()} />
          </View>

          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
            <PrimaryButton
              label="Confirm teammates"
              variant="ghost"
              full
              onPress={() => { Haptics.selectionAsync(); router.push('/confirm'); }}
            />
          </View>

          <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[5] }}>
            {signOutError ? (
              <Txt variant="bodySm" tone="ash" style={{ marginBottom: space[2], textAlign: 'center' }}>
                {signOutError}
              </Txt>
            ) : null}
            <PrimaryButton
              label="Sign out"
              variant="ghost"
              full
              disabled={isSigningOut}
              onPress={handleSignOut}
            />
          </View>
        </ScrollView>

        <StatEntrySheet ref={sheetRef} ageBand={profile?.age_band ?? null} metrics={catalogQ.data ?? []} onSaved={onSaved} />
        <ProfileEditSheet ref={editRef} profile={profile ?? null} onSaved={onProfileSaved} />
      </View>
  );
}
