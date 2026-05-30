import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { Txt } from '../components/primitives/Text';
import { useTheme, space, type } from '../theme';

const LETTERS = ['E', 'L', 'E', 'V', 'A', 'T', 'E'];
// Peak ember on the central letter. The single sanctioned accent moment for splash.
const ACCENT_INDEX = 3;

function Letter({
  char,
  delay,
  accent,
}: {
  char: string;
  delay: number;
  accent: boolean;
}) {
  const { colors } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 480, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
  }, [delay, t]);

  const animated = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 14 }],
  }));

  // display1 is the theme's hero size (800/56). The wordmark reads monumental
  // by virtue of the variant + centered framing — we don't reach for a magic
  // fontSize override since the theme owns the scale.
  return (
    <Animated.Text
      allowFontScaling={false}
      style={[
        type.display1,
        {
          color: accent ? colors.ember : colors.ink,
        },
        animated,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

export default function Splash() {
  const router = useRouter();
  const { colors } = useTheme();
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 480 }));
    const t = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2400);
    return () => clearTimeout(t);
  }, [router, taglineOpacity]);

  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.paper,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View style={{ flexDirection: 'row' }}>
        {LETTERS.map((c, i) => (
          <Letter
            key={i}
            char={c}
            delay={i * 60}
            accent={i === ACCENT_INDEX}
          />
        ))}
      </View>
      <Animated.View style={[{ marginTop: space[5] }, taglineStyle]}>
        <Txt variant="micro" tone="ash">
          YOUR GAME, BY THE NUMBERS
        </Txt>
      </Animated.View>
    </View>
  );
}
