import { useCallback, useState } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MastheadBar } from '../../components/composite/MastheadBar';
import { HairlineRule } from '../../components/primitives/HairlineRule';
import { MicroLabel } from '../../components/primitives/MicroLabel';
import { LeadStory } from '../../components/composite/LeadStory';
import { LiveStrip } from '../../components/composite/LiveStrip';
import { AthleteRow } from '../../components/composite/AthleteRow';
import {
  QuoteCard,
  StatCard,
  StoryCard,
} from '../../components/composite/EditorialCard';
import { Txt } from '../../components/primitives/Text';
import { MarginRefresh } from '../../components/motion/MarginRefresh';

import { stories } from '../../data/fixtures/stories';
import { games } from '../../data/fixtures/games';
import { athleteById } from '../../data/fixtures/athletes';
import { useUserStore } from '../../state/user';
import { useTheme, space } from '../../theme';
import { timeAgo } from '../../lib/utils/format';

const followingContexts: Record<string, { context: string; iso: string }> = {
  luka: { context: '38 pts, 11 ast, 9 reb in the win at MIN', iso: '2026-05-18T01:02:00-04:00' },
  caitlin: { context: '31 pts, 13 ast, 6 reb · win vs CHI', iso: '2026-05-18T13:45:00-04:00' },
  lebron: { context: '27 pts, 8 ast in the win vs NYK', iso: '2026-05-18T02:14:00-04:00' },
  jokic: { context: 'Triple-double: 32 / 14 / 11 in win at SAC', iso: '2026-05-17T22:30:00-04:00' },
  tatum: { context: '34 pts, 9 reb in the win vs CLE', iso: '2026-05-18T03:55:00-04:00' },
  brunson: { context: '32 pts, 4 reb, 8 ast in loss at LAL', iso: '2026-05-18T02:50:00-04:00' },
};

export default function TodayScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const followingIds = useUserStore((s) => s.followingAthletes);

  const [lead, ...rest] = stories;
  const editorialRest = rest;

  const liveGames = games.filter((g) => g.status === 'live' || g.status === 'scheduled').slice(0, 6);

  const followed = followingIds
    .map((id) => athleteById(id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .slice(0, 6);

  const pull = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const [, setRefreshCount] = useState(0);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise((r) => setTimeout(r, 1300));
    setRefreshCount((n) => n + 1);
    setRefreshing(false);
    pull.value = withTiming(0, { duration: 240 });
  }, [refreshing, pull]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      pull.value = y < 0 ? -y : 0;
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
      <MastheadBar />

      <View style={{ flex: 1 }}>
        <MarginRefresh pull={pull} refreshing={refreshing} />
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          bounces
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          onScrollEndDrag={(e) => {
            if (e.nativeEvent.contentOffset.y < -80) onRefresh();
          }}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        >
          <View style={{ paddingTop: space[5] }}>
            <View style={{ paddingHorizontal: space[5], marginBottom: space[3] }}>
              <MicroLabel>
                EDITOR'S PICK · {new Date()
                  .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  .toUpperCase()}
              </MicroLabel>
            </View>
            <LeadStory story={lead} />
          </View>

          <HairlineRule style={{ marginVertical: space[6] }} />

          <LiveStrip games={liveGames} />

          <HairlineRule style={{ marginVertical: space[7] }} />

          <View style={{ paddingHorizontal: space[5], marginBottom: space[3] }}>
            <MicroLabel>WHO YOU FOLLOW</MicroLabel>
          </View>

          {followed.map((athlete, i) => {
            const meta = followingContexts[athlete.id] ?? {
              context: athlete.bio ?? 'On a heater.',
              iso: '2026-05-18T02:00:00-04:00',
            };
            return (
              <View key={athlete.id}>
                <AthleteRow
                  athlete={athlete}
                  context={meta.context}
                  timeAgo={timeAgo(meta.iso)}
                />
                {i < followed.length - 1 && <HairlineRule />}
              </View>
            );
          })}

          <HairlineRule style={{ marginVertical: space[7] }} />

          {editorialRest[0] && (
            <View>
              <StoryCard story={editorialRest[0]} />
              <HairlineRule />
            </View>
          )}

          <QuoteCard
            text="I don’t need to be fast. I need to be on time."
            by="LUKA DONČIĆ"
          />
          <HairlineRule />

          <StatCard
            value={22.6}
            label="CAITLIN CLARK · LAST 5 GAMES · PPG"
            trend={[19, 28, 24, 22, 35]}
          />
          <HairlineRule />

          {editorialRest[1] && (
            <View>
              <StoryCard story={editorialRest[1]} />
              <HairlineRule />
            </View>
          )}

          {editorialRest[2] && (
            <View>
              <StoryCard story={editorialRest[2]} />
              <HairlineRule />
            </View>
          )}

          {editorialRest[3] && (
            <View>
              <StoryCard story={editorialRest[3]} />
              <HairlineRule />
            </View>
          )}

          <View style={{ paddingVertical: space[10], alignItems: 'center' }}>
            <Txt
              variant="display4"
              italic
              tone="ash"
              style={{ fontSize: 18, fontFamily: 'InstrumentSerifItalic' }}
            >
              End of feed.
            </Txt>
          </View>
        </Animated.ScrollView>
      </View>
    </View>
  );
}
