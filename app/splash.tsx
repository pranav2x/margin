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
import { useTheme, space, fonts } from '../theme';

const LETTERS = ['E', 'L', 'E', 'V', 'A', 'T', 'E'];

function Letter({ char, delay }: { char: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withTiming(1, { duration: 480, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
  }, [delay, t]);

  const animated = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * 12 }],
  }));

  return (
    <Animated.Text
      allowFontScaling={false}
      style={[
        {
          fontFamily: fonts.serif,
          fontSize: 72,
          lineHeight: 80,
          letterSpacing: -1.5,
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
          <Letter key={i} char={c} delay={i * 60} />
        ))}
      </View>
      <Animated.View style={[{ marginTop: space[5] }, taglineStyle]}>
        <Txt
          variant="micro"
          tone="ash"
          style={{ letterSpacing: 2.2 }}
        >
          YOUR GAME, BY THE NUMBERS
        </Txt>
      </Animated.View>
    </View>
  );
}
