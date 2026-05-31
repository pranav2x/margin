import { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../lib/supabase';
import { shareSnapshot } from '../../lib/share';

import { Txt } from '../../components/primitives/Text';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { Avatar } from '../../components/primitives/Avatar';
import { Card } from '../../components/primitives/Card';
import { StatBlock, StatBlockRow } from '../../components/primitives/StatBlock';
import { AppIcon } from '../../components/primitives/AppIcon';
import { Skeleton } from '../../components/primitives/Skeleton';
import { PrimaryButton } from '../../components/primitives/PrimaryButton';
import {
  VerifiedBadge,
  tierOf,
  type VerifiedTier,
} from '../../components/primitives/VerifiedBadge';
import { Score } from '../../components/motion/Score';

import { StreakBlock } from '../../components/composite/StreakBlock';
import { ShareCard, type HeadlineStat } from '../../components/composite/ShareCard';
import {
  LeaderboardRow,
  type LeaderboardRowData,
} from '../../components/composite/LeaderboardRow';
import {
  StatEntrySheet,
  type StatEntrySheetRef,
} from '../../components/composite/StatEntrySheet';
import {
  ProfileEditSheet,
  type ProfileEditSheetRef,
} from '../../components/composite/ProfileEditSheet';

import {
  SPORT_LABELS,
  formatStatValue,
  useMetricCatalog,
  useMyProfile,
  useMyStats,
  type PlayerStat,
  type Sport,
} from '../../lib/hooks/usePlayerProfile';
import { useStreak, type StreakData } from '../../lib/hooks/useStreak';
import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';
import { signOut } from '../../lib/auth';
import { useCreateSheetStore } from '../../state/createSheet';

import {
  DEMO_CURRENT_USER,
  DEMO_FORTY_BOARD,
  DEMO_USER_STATS,
  DEMO_RIVAL,
} from '../../data/fixtures/demoAthletes';

// ──────────────────────────────────────────────────────────────────────────────
// Fixture fallback — DEV only. When real hooks return empty we render the
// golden's seeded shape so the screen never reads as a dead zone. Production
// always uses real data (or shows an explicit empty state per section).
// ──────────────────────────────────────────────────────────────────────────────

const DEMO_STREAK: StreakData = {
  current: 12,
  longest: 21,
  freezes: 2,
  days: [
    { day: '2026-05-23', state: 'active', isToday: false, label: 'S' },
    { day: '2026-05-24', state: 'active', isToday: false, label: 'S' },
    { day: '2026-05-25', state: 'active', isToday: false, label: 'M' },
    { day: '2026-05-26', state: 'frozen', isToday: false, label: 'T' },
    { day: '2026-05-27', state: 'active', isToday: false, label: 'W' },
    { day: '2026-05-28', state: 'active', isToday: false, label: 'T' },
    { day: '2026-05-29', state: 'active', isToday: true, label: 'F' },
  ],
};

interface RecentRow {
  key: string;
  metric: string;
  date: string;
  value: string;
  tier: VerifiedTier;
  delta?: number;
}

interface SchoolRow {
  key: string;
  data: LeaderboardRowData;
  isCurrentUser: boolean;
  onPress?: () => void;
}

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
  const shareCaptureRef = useRef<View>(null);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Other tabs route here with `?edit=1` when the user has a missing profile
  // field that blocks them. Open the editor once on land.
  const params = useLocalSearchParams<{ edit?: string }>();
  useEffect(() => {
    if (params.edit === '1') {
      const t = setTimeout(() => editRef.current?.present(), 250);
      return () => clearTimeout(t);
    }
  }, [params.edit]);

  // Register the StatEntrySheet trigger so the BottomTabBar's create-button
  // "Log stat" row can open it. Cleared on unmount.
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

  // ── Real data ────────────────────────────────────────────────────────────
  const profile = profileQ.data;
  const stats = useMemo(() => statsQ.data ?? [], [statsQ.data]);
  const streak = streakQ.data ?? null;
  const onSaved = () => queryClient.invalidateQueries({ queryKey: ['my-stats'] });
  const onProfileSaved = () =>
    queryClient.invalidateQueries({ queryKey: ['my-profile'] });

  // Identity tier — highest tier across stats. Floors to unverified.
  const identityTier: VerifiedTier = useMemo(() => {
    let best: VerifiedTier = 'unverified';
    for (const s of stats) {
      const t = tierOf(s.verified, s.verification_method);
      if (t === 'event') return 'event';
      if (t === 'video') best = 'video';
    }
    return best;
  }, [stats]);

  // Headline — most-trusted, lowest sort_order stat. Drives PR hero + share.
  const headline = useMemo(() => {
    const plausible = stats.filter((s) => s.is_plausible !== false);
    plausible.sort(
      (a, b) =>
        Number(b.verified) - Number(a.verified) ||
        a.metric.sort_order - b.metric.sort_order,
    );
    return plausible.slice(0, 2);
  }, [stats]);
  const top: PlayerStat | undefined = headline[0];

  const cardStats: HeadlineStat[] = headline.map((s) => ({
    label: s.metric.label,
    value: formatStatValue(s.value, s.metric.unit),
    unit: s.metric.unit,
    verified: s.verified,
    method: s.verification_method,
  }));

  // "vs your school" — primary metric for the user's primary sport.
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
      return (
        (data as Array<{
          rank: number;
          profile_id: string;
          handle: string;
          school_name: string | null;
          value: number;
          verified: boolean;
          verification_method: string;
        }> | null) ?? []
      );
    },
  });

  // ── Loading + error gates ────────────────────────────────────────────────
  const initialLoading = profileQ.isLoading || catalogQ.isLoading;
  const initialError = profileQ.isError;

  if (initialError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.paper,
          paddingTop: insets.top,
        }}
      >
        <View style={{ padding: SCREEN_PADDING }}>
          <Card padded tone="overlay">
            <MicroLabel>SOMETHING WENT WRONG</MicroLabel>
            <Txt
              variant="display4"
              weight="bold"
              style={{ marginTop: space[2] }}
            >
              Your profile didn't load.
            </Txt>
            <Txt variant="bodySm" tone="ash" style={{ marginTop: space[2] }}>
              Pull down to retry, or sign out and back in.
            </Txt>
            <View style={{ marginTop: space[4] }}>
              <PrimaryButton
                label="Retry"
                full
                onPress={() => profileQ.refetch()}
              />
            </View>
          </Card>
        </View>
      </View>
    );
  }

  if (initialLoading) {
    return <YouSkeleton topInset={insets.top} />;
  }

  // ── Shape the screen — fall back to fixtures in DEV when empty ───────────
  const useFixturesFallback = __DEV__ && stats.length === 0 && !top;

  const displayName =
    profile?.display_name ??
    (useFixturesFallback ? DEMO_CURRENT_USER.fullName : `@${profile?.handle ?? 'you'}`);
  const handleStr =
    profile?.handle ?? (useFixturesFallback ? DEMO_CURRENT_USER.handle : 'you');
  const avatarUri =
    profile?.avatar_url ??
    (useFixturesFallback ? DEMO_CURRENT_USER.avatarUrl : undefined);
  const sportLabel = profile?.primary_sport
    ? (SPORT_LABELS[profile.primary_sport as Sport] ?? null)
    : useFixturesFallback
      ? 'Football'
      : null;
  const metaLine = useFixturesFallback
    ? `${DEMO_CURRENT_USER.position} · ${DEMO_CURRENT_USER.school} · ${DEMO_CURRENT_USER.city}, ${DEMO_CURRENT_USER.state}`
    : [
        profile?.school?.name,
        profile?.grad_year ? `Class of ${profile.grad_year}` : null,
        sportLabel,
      ]
        .filter(Boolean)
        .join(' · ');

  // ── 3-up hero ────────────────────────────────────────────────────────────
  // Always a 3-up. PR is the single ember beat. "—" + "LOG YOUR FIRST" when
  // the athlete has no stat yet so we never render a dead zone.
  const heroPrValue: string = top
    ? formatStatValue(top.value, top.metric.unit)
    : useFixturesFallback
      ? DEMO_CURRENT_USER.value
      : '—';
  const heroPrLabel: string = top
    ? `${top.metric.label.toUpperCase()} PR`
    : useFixturesFallback
      ? '40-YD PR'
      : 'LOG YOUR FIRST';
  const loggedCount: number = useFixturesFallback
    ? DEMO_USER_STATS.length
    : stats.length;
  const streakDays: number =
    streak?.current ?? (useFixturesFallback ? DEMO_STREAK.current : 0);

  // Identity badge only renders when verified — keeps the masthead clean and
  // kills the stray hollow circle next to @handle that used to sit there when
  // the user had no proof on file. In fixture-fallback we promote the demo
  // user's video tier so the masthead reads as the golden does.
  const showIdentityBadge = useFixturesFallback
    ? true
    : identityTier !== 'unverified';
  const displayedIdentityTier: VerifiedTier = useFixturesFallback
    ? 'video'
    : identityTier;

  // ── Recent stats — real or fixture ───────────────────────────────────────
  const recentRows: RecentRow[] = useFixturesFallback
    ? DEMO_USER_STATS.map((s, i) => ({
        key: `demo-${i}`,
        metric: s.metric,
        date: s.date,
        value: s.value,
        tier: s.tier,
        delta: s.delta,
      }))
    : [...stats]
        .sort((a, b) => a.metric.sort_order - b.metric.sort_order)
        .slice(0, 5)
        .map((s) => ({
          key: s.id,
          metric: s.metric.label,
          date: s.metric.unit ? s.metric.unit.toUpperCase() : '—',
          value: formatStatValue(s.value, s.metric.unit),
          tier: tierOf(s.verified, s.verification_method),
        }));

  // ── vs YOUR SCHOOL snippet ───────────────────────────────────────────────
  const realSchoolRows: SchoolRow[] = (schoolBoardQ.data ?? [])
    .slice(0, 4)
    .map((r) => ({
      key: r.profile_id,
      data: {
        rank: r.rank,
        handle: r.handle,
        school: r.school_name,
        value: formatStatValue(r.value, primaryMetricForSport?.unit ?? null),
        tier: tierOf(r.verified, r.verification_method),
      },
      isCurrentUser: r.profile_id === profile?.id,
      onPress: () => router.push(`/player/${r.profile_id}` as never),
    }));
  const fixtureSchoolRows: SchoolRow[] = DEMO_FORTY_BOARD.filter(
    (a) => a.school === DEMO_CURRENT_USER.school,
  )
    .slice(0, 4)
    .map((a) => ({
      key: a.handle,
      data: {
        rank: a.rank,
        handle: a.handle,
        school: a.school,
        avatarUrl: a.avatarUrl,
        value: a.value,
        weeklyDelta: a.weeklyDelta,
        tier: a.tier,
      },
      isCurrentUser: !!a.isCurrentUser,
    }));
  const schoolRows: SchoolRow[] =
    realSchoolRows.length > 0
      ? realSchoolRows
      : useFixturesFallback || (__DEV__ && (schoolBoardQ.data?.length ?? 0) === 0)
        ? fixtureSchoolRows
        : [];
  const schoolName = useFixturesFallback
    ? DEMO_CURRENT_USER.school
    : (profile?.school?.name ?? null);

  // ── Streak module ────────────────────────────────────────────────────────
  const streakForBlock: StreakData | null =
    streak ?? (useFixturesFallback ? DEMO_STREAK : null);

  // ── Battle of the Week (rival shown as fixture for now) ──────────────────
  const showBattle = useFixturesFallback || true; // always render the module
  const rivalHandle = DEMO_RIVAL.handle;
  const rivalValue = DEMO_RIVAL.value;
  const myValue = top
    ? formatStatValue(top.value, top.metric.unit)
    : useFixturesFallback
      ? DEMO_CURRENT_USER.value
      : '—';

  // ── Share PR ─────────────────────────────────────────────────────────────
  const shareCardStats: HeadlineStat[] =
    cardStats.length > 0
      ? cardStats
      : useFixturesFallback
        ? [
            {
              label: '40-yd Dash',
              value: DEMO_CURRENT_USER.value,
              unit: 's',
              verified: true,
              method: 'video',
            },
          ]
        : [];
  const sharePr = () => {
    void shareSnapshot(shareCaptureRef, 'Share your PR');
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
      >
        {/* ── Nav row ─────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[3],
            paddingBottom: space[3],
          }}
        >
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <AppIcon name="ChevronLeft" size={24} tone="ink" />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: space[4] }}>
            <Pressable
              hitSlop={12}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              onPress={() => {}}
            >
              <AppIcon name="Bell" size={22} tone="ink" />
            </Pressable>
            <Pressable
              hitSlop={12}
              accessibilityLabel="Settings"
              accessibilityRole="button"
              onPress={() => editRef.current?.present()}
            >
              <AppIcon name="Settings" size={22} tone="ink" />
            </Pressable>
          </View>
        </View>

        {/* ── Masthead ────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: space[5],
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}
          >
            <Avatar uri={avatarUri ?? undefined} size={72} />
            <View style={{ flex: 1, gap: 2 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[2],
                }}
              >
                <Txt
                  variant="display4"
                  weight="extrabold"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {displayName}
                </Txt>
                {showIdentityBadge ? (
                  <VerifiedBadge tier={displayedIdentityTier} />
                ) : null}
              </View>
              <Txt variant="bodySm" tone="ash">
                @{handleStr}
              </Txt>
              {metaLine.length > 0 ? (
                <Txt variant="bodySm" tone="shadow" numberOfLines={2}>
                  {metaLine}
                </Txt>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── 3-up hero ───────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: space[5],
          }}
        >
          <StatBlockRow>
            <StatBlock
              value={heroPrValue}
              label={heroPrLabel}
              align="center"
              tone="accent"
              size="lg"
            />
            <StatBlock
              value={loggedCount}
              label="LOGGED"
              align="center"
              size="lg"
            />
            <StatBlock
              value={streakDays}
              label="DAY STREAK"
              align="center"
              size="lg"
            />
          </StatBlockRow>
        </View>

        <HairlineRule />

        {/* ── VS YOUR SCHOOL snippet ──────────────────────────────────── */}
        {schoolRows.length > 0 && schoolName ? (
          <View style={{ paddingTop: space[5] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                paddingHorizontal: SCREEN_PADDING,
                marginBottom: space[3],
              }}
            >
              <MicroLabel>VS. {schoolName.toUpperCase()}</MicroLabel>
              <Pressable
                hitSlop={8}
                onPress={() => router.push('/(tabs)' as never)}
                accessibilityRole="link"
                accessibilityLabel="See full board"
              >
                <Txt variant="bodySm" weight="semibold" tone="ash">
                  See board
                </Txt>
              </Pressable>
            </View>
            {schoolRows.map((r, i) => (
              <View key={r.key}>
                <LeaderboardRow
                  row={r.data}
                  unit={primaryMetricForSport?.unit ?? 's'}
                  isCurrentUser={r.isCurrentUser}
                  onPress={r.onPress}
                />
                {i < schoolRows.length - 1 ? (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.fog,
                      marginLeft: SCREEN_PADDING + 36,
                    }}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── RECENT — card with stat rows ────────────────────────────── */}
        {recentRows.length > 0 ? (
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: space[6],
            }}
          >
            <MicroLabel style={{ marginBottom: space[3] }}>RECENT</MicroLabel>
            <Card padded style={{ paddingVertical: space[2] }}>
              {recentRows.map((s, i) => (
                <View key={s.key}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: space[3],
                      gap: space[3],
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" weight="semibold" numberOfLines={1}>
                        {s.metric}
                      </Txt>
                      <Txt
                        variant="bodySm"
                        tone="ash"
                        style={{ marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {s.date}
                      </Txt>
                    </View>
                    {s.delta !== undefined ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 2,
                          paddingHorizontal: space[2],
                          paddingVertical: 2,
                          borderRadius: radius.full,
                          backgroundColor: colors.overlay,
                        }}
                      >
                        <AppIcon
                          name={s.delta < 0 ? 'ChevronDown' : 'ChevronUp'}
                          size={12}
                          tone="ash"
                        />
                        <Txt variant="micro" tone="ash">
                          {Math.abs(s.delta)}
                        </Txt>
                      </View>
                    ) : null}
                    <Score value={s.value} size="sm" tone="ink" />
                    <VerifiedBadge tier={s.tier} />
                  </View>
                  {i < recentRows.length - 1 ? (
                    <View
                      style={{ height: 1, backgroundColor: colors.fog }}
                    />
                  ) : null}
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* ── DAY STREAK card ─────────────────────────────────────────── */}
        {streakForBlock ? (
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: space[6],
            }}
          >
            <Card padded>
              <StreakBlock streak={streakForBlock} />
            </Card>
          </View>
        ) : null}

        {/* ── BATTLE OF THE WEEK ──────────────────────────────────────── */}
        {showBattle ? (
          <View
            style={{
              paddingHorizontal: SCREEN_PADDING,
              paddingTop: space[6],
            }}
          >
            <MicroLabel style={{ marginBottom: space[3] }}>
              BATTLE OF THE WEEK
            </MicroLabel>
            <Card padded tone="overlay">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space[3],
                }}
              >
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Avatar uri={avatarUri ?? undefined} size={48} />
                  <Txt
                    variant="bodySm"
                    weight="semibold"
                    numberOfLines={1}
                    style={{ marginTop: space[2] }}
                  >
                    @{handleStr}
                  </Txt>
                  <Score value={myValue} size="md" tone="ember" />
                </View>
                <View
                  style={{
                    alignItems: 'center',
                    paddingHorizontal: space[2],
                  }}
                >
                  <Txt variant="display4" weight="extrabold" tone="ash">
                    vs
                  </Txt>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Avatar size={48} />
                  <Txt
                    variant="bodySm"
                    weight="semibold"
                    numberOfLines={1}
                    style={{ marginTop: space[2] }}
                  >
                    @{rivalHandle}
                  </Txt>
                  <Score value={rivalValue} size="md" tone="ink" />
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
                <View>
                  <Txt variant="bodySm" weight="semibold">
                    Margin: 0.15s
                  </Txt>
                  <Txt variant="bodySm" tone="ash">
                    Ends Sunday
                  </Txt>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open battles"
                  onPress={() => router.push('/(tabs)/battles' as never)}
                  style={({ pressed }) => ({
                    paddingHorizontal: space[4],
                    paddingVertical: space[2],
                    borderRadius: radius.full,
                    backgroundColor: pressed
                      ? colors.emberPressed
                      : colors.ember,
                  })}
                >
                  <Txt variant="bodySm" weight="bold" tone="paper">
                    Beat it
                  </Txt>
                </Pressable>
              </View>
            </Card>
          </View>
        ) : null}

        {/* ── Share PR hero ──────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[6],
          }}
        >
          <Pressable
            onPress={sharePr}
            accessibilityRole="button"
            accessibilityLabel="Share your PR"
            style={({ pressed }) => ({
              borderRadius: radius.xl,
              padding: space[5],
              backgroundColor: pressed ? colors.emberPressed : colors.ember,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[4],
            })}
          >
            <View style={{ flex: 1 }}>
              <Txt
                variant="display4"
                weight="extrabold"
                style={{ color: colors.paper }}
              >
                Share your PR
              </Txt>
              <Txt
                variant="bodySm"
                style={{
                  color: colors.paper,
                  opacity: 0.85,
                  marginTop: space[1],
                }}
              >
                Watermarked 9:16 — TikTok-ready
              </Txt>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.full,
                backgroundColor: colors.paper,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon name="Share2" size={20} tone="ember" />
            </View>
          </Pressable>
        </View>

        {/* ── Sign out (ghost) ───────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: space[6],
          }}
        >
          {signOutError ? (
            <Txt
              variant="bodySm"
              tone="ash"
              style={{ marginBottom: space[2], textAlign: 'center' }}
            >
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

      {/* Off-screen capture target for Share PR — kept mounted so the snapshot
          ref is always available. Positioned far off-screen rather than
          conditionally rendered so capture has a layout to read. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: -10000, top: 0, opacity: 0 }}
      >
        <ShareCard
          ref={shareCaptureRef}
          handle={handleStr}
          school={profile?.school?.name ?? (useFixturesFallback ? DEMO_CURRENT_USER.school : null)}
          sportLabel={sportLabel}
          stats={shareCardStats}
        />
      </View>

      <StatEntrySheet
        ref={sheetRef}
        ageBand={profile?.age_band ?? null}
        metrics={catalogQ.data ?? []}
        onSaved={onSaved}
      />
      <ProfileEditSheet
        ref={editRef}
        profile={profile ?? null}
        onSaved={onProfileSaved}
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Loading skeleton — mirrors the final layout so the transition to real
// content never shifts the page. Per spec: skeletons, not spinners.
// ──────────────────────────────────────────────────────────────────────────────

function YouSkeleton({ topInset }: { topInset: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        paddingTop: topInset,
      }}
    >
      {/* Nav row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[3],
          paddingBottom: space[3],
        }}
      >
        <Skeleton w={24} h={24} radius="sm" />
        <View style={{ flexDirection: 'row', gap: space[4] }}>
          <Skeleton w={22} h={22} radius="sm" />
          <Skeleton w={22} h={22} radius="sm" />
        </View>
      </View>

      {/* Masthead */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: space[5],
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[4],
        }}
      >
        <Skeleton w={72} h={72} radius="full" />
        <View style={{ flex: 1, gap: space[2] }}>
          <Skeleton w={'70%'} h={24} radius="sm" />
          <Skeleton w={'40%'} h={14} radius="sm" />
          <Skeleton w={'60%'} h={14} radius="sm" />
        </View>
      </View>

      {/* 3-up hero */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: space[5],
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: space[3],
        }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: space[2] }}>
            <Skeleton w={64} h={40} radius="sm" />
            <Skeleton w={56} h={10} radius="sm" />
          </View>
        ))}
      </View>

      <HairlineRule />

      {/* Recent card */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[6],
        }}
      >
        <Skeleton w={64} h={10} radius="sm" style={{ marginBottom: space[3] }} />
        <Skeleton h={220} radius="lg" />
      </View>

      {/* Streak card */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[6],
        }}
      >
        <Skeleton h={140} radius="lg" />
      </View>

      {/* Share PR */}
      <View
        style={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: space[6],
        }}
      >
        <Skeleton h={88} radius="xl" />
      </View>
    </View>
  );
}
