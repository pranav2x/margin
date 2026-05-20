import { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { Txt } from '../primitives/Text';
import { MicroLabel } from '../primitives/MicroLabel';
import { HairlineRule } from '../primitives/HairlineRule';
import { PressableScale } from '../primitives/PressableScale';
import { Score } from '../motion/Score';
import { useTheme, space, SCREEN_PADDING } from '../../theme';
import type { Game } from '../../types';
import { useRouter } from 'expo-router';

function LivePulse({ inverted }: { inverted?: boolean }) {
  const { colors } = useTheme();
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        {
          width: 6,
          height: 6,
          backgroundColor: inverted ? colors.paper : colors.ink,
          borderRadius: 3,
        },
        style,
      ]}
    />
  );
}

function LiveCard({ game, onPress }: { game: Game; onPress: () => void }) {
  const { colors } = useTheme();
  const eyebrow =
    game.status === 'live'
      ? `LIVE · ${game.period} ${game.clock}`
      : game.status === 'final'
        ? 'FINAL'
        : 'NEXT UP';

  return (
    <PressableScale
      onPress={onPress}
      style={{
        width: 220,
        height: 130,
        backgroundColor: colors.paper,
        borderWidth: 1,
        borderColor: colors.fog,
        padding: space[4],
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        {game.status === 'live' && <LivePulse />}
        <MicroLabel tone="ink">{eyebrow}</MicroLabel>
      </View>

      <View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: space[1],
          }}
        >
          <Txt variant="bodySm" style={{ fontWeight: undefined }}>
            {game.away.team.abbreviation}
          </Txt>
          <Score value={game.away.score} size="md" />
        </View>
        <HairlineRule />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: space[1],
          }}
        >
          <Txt variant="bodySm">{game.home.team.abbreviation}</Txt>
          <Score value={game.home.score} size="md" />
        </View>
      </View>
    </PressableScale>
  );
}

interface Props {
  games: Game[];
}

export function LiveStrip({ games }: Props) {
  const router = useRouter();

  return (
    <View>
      <View style={{ paddingHorizontal: SCREEN_PADDING, marginBottom: space[3] }}>
        <MicroLabel>LIVE & UPCOMING</MicroLabel>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, gap: space[3] }}
      >
        {games.map((g) => (
          <LiveCard
            key={g.id}
            game={g}
            onPress={() => router.push(`/game/${g.id}` as never)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
