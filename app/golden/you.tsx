import { ScrollView, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Txt } from '../../components/primitives/Text';
import { AppIcon } from '../../components/primitives/AppIcon';
import { Avatar } from '../../components/primitives/Avatar';
import { Card } from '../../components/primitives/Card';
import { VerifiedBadge } from '../../components/primitives/VerifiedBadge';
import { StatBlock, StatBlockRow } from '../../components/primitives/StatBlock';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { Score } from '../../components/motion/Score';
import { LeaderboardRow } from '../../components/composite/LeaderboardRow';
import { StreakBlock } from '../../components/composite/StreakBlock';
import type { StreakData } from '../../lib/hooks/useStreak';

import { useTheme, space, radius, SCREEN_PADDING } from '../../theme';
import {
  DEMO_CURRENT_USER,
  DEMO_FORTY_BOARD,
  DEMO_USER_STATS,
  DEMO_RIVAL,
} from '../../data/fixtures/demoAthletes';

// Fake-but-shaped streak for the golden screen. The real screen reads from
// useStreak(); this is just to render the strip without a network call.
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
    { day: '2026-05-29', state: 'active', isToday: true,  label: 'F' },
  ],
};

// Three rows above + the current-user row + one below, for the school snippet.
const SCHOOL_SNIPPET = DEMO_FORTY_BOARD.filter(
  (a) => a.school === DEMO_CURRENT_USER.school,
).slice(0, 4);

/**
 * You — golden reference. Dense profile: masthead, 3-up hero stats, recent
 * activity, "vs your school" snippet, streak, share CTA. No "no headline
 * stat yet" dead zone. Single accent (ember) reserved for: hero PR, streak
 * flame + count, "Share PR" CTA, current-user row highlight.
 */
export default function GoldenYou() {
  const { colors } = useTheme();
  const router = useRouter();
  const user = DEMO_CURRENT_USER;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space[9] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Nav row ────────────────────────────────────────────────────── */}
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
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
            <AppIcon name="ChevronLeft" size={24} tone="ink" />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: space[4] }}>
            <AppIcon name="Bell" size={22} tone="ink" />
            <AppIcon name="Settings" size={22} tone="ink" />
          </View>
        </View>

        {/* ── Masthead ───────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space[5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
            <Avatar uri={user.avatarUrl} size={72} />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                <Txt variant="display4" weight="extrabold">{user.fullName}</Txt>
                <VerifiedBadge tier="video" />
              </View>
              <Txt variant="bodySm" tone="ash">@{user.handle}</Txt>
              <Txt variant="bodySm" tone="shadow">
                {user.position} · {user.school} · {user.city}, {user.state}
              </Txt>
            </View>
          </View>
        </View>

        {/* ── Hero stats — 3-up ──────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: space[5] }}>
          <StatBlockRow>
            <StatBlock value={user.value} label="40-YD PR" align="center" tone="accent" size="lg" />
            <StatBlock value={DEMO_USER_STATS.length} label="LOGGED" align="center" size="lg" />
            <StatBlock value={DEMO_STREAK.current} label="DAY STREAK" align="center" size="lg" />
          </StatBlockRow>
        </View>

        <HairlineRule />

        {/* ── vs. your school snippet ────────────────────────────────────── */}
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
            <MicroLabel>VS. {user.school.toUpperCase()}</MicroLabel>
            <Pressable hitSlop={8} onPress={() => router.push('/golden/boards')}>
              <Txt variant="bodySm" weight="semibold" tone="ash">See board</Txt>
            </Pressable>
          </View>

          {SCHOOL_SNIPPET.map((a, i) => (
            <View key={a.handle}>
              <LeaderboardRow
                row={{
                  rank: a.rank,
                  handle: a.handle,
                  school: a.school,
                  avatarUrl: a.avatarUrl,
                  value: a.value,
                  weeklyDelta: a.weeklyDelta,
                  tier: a.tier,
                }}
                unit="s"
                isCurrentUser={!!a.isCurrentUser}
              />
              {i < SCHOOL_SNIPPET.length - 1 ? (
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

        {/* ── Recent stats ───────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
          <MicroLabel style={{ marginBottom: space[3] }}>RECENT</MicroLabel>
          <Card padded style={{ paddingVertical: space[2] }}>
            {DEMO_USER_STATS.map((s, i) => (
              <View key={`${s.date}-${s.metric}`}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: space[3],
                    gap: space[3],
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" weight="semibold">{s.metric}</Txt>
                    <Txt variant="bodySm" tone="ash" style={{ marginTop: 2 }}>{s.date}</Txt>
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
                {i < DEMO_USER_STATS.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: colors.fog }} />
                ) : null}
              </View>
            ))}
          </Card>
        </View>

        {/* ── Streak ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
          <Card padded>
            <StreakBlock streak={DEMO_STREAK} />
          </Card>
        </View>

        {/* ── Battle of the Week ─────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
          <MicroLabel style={{ marginBottom: space[3] }}>BATTLE OF THE WEEK</MicroLabel>
          <Card padded tone="overlay">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Avatar size={48} />
                <Txt
                  variant="bodySm"
                  weight="semibold"
                  numberOfLines={1}
                  style={{ marginTop: space[2] }}
                >
                  @{user.handle}
                </Txt>
                <Score value={user.value} size="md" tone="ember" />
              </View>
              <View style={{ alignItems: 'center', paddingHorizontal: space[2] }}>
                <Txt variant="display4" weight="extrabold" tone="ash">vs</Txt>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Avatar size={48} />
                <Txt
                  variant="bodySm"
                  weight="semibold"
                  numberOfLines={1}
                  style={{ marginTop: space[2] }}
                >
                  @{DEMO_RIVAL.handle}
                </Txt>
                <Score value={DEMO_RIVAL.value} size="md" tone="ink" />
              </View>
            </View>
            <HairlineRule style={{ marginVertical: space[4] }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Txt variant="bodySm" weight="semibold">Margin: 0.15s</Txt>
                <Txt variant="bodySm" tone="ash">Ends Sunday</Txt>
              </View>
              <View
                style={{
                  paddingHorizontal: space[4],
                  paddingVertical: space[2],
                  borderRadius: radius.full,
                  backgroundColor: colors.ember,
                }}
              >
                <Txt variant="bodySm" weight="bold" tone="paper">Beat it</Txt>
              </View>
            </View>
          </Card>
        </View>

        {/* ── Share PR hero ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING, paddingTop: space[6] }}>
          <Pressable
            onPress={() => {}}
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
              <Txt variant="display4" weight="extrabold" style={{ color: colors.paper }}>
                Share your PR
              </Txt>
              <Txt variant="bodySm" style={{ color: colors.paper, opacity: 0.85, marginTop: space[1] }}>
                Watermarked 9:16 — TikTok-ready
              </Txt>
            </View>
            <View
              style={{
                width: 44, height: 44, borderRadius: radius.full,
                backgroundColor: colors.paper,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <AppIcon name="Share2" size={20} tone="ember" />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
