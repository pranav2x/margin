import { useEffect } from 'react';
import { View, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  interpolate,
  Extrapolation,
  type SharedValue,
  withRepeat,
  useSharedValue,
} from 'react-native-reanimated';
import { fonts, type, useTheme } from '../../theme';
import { space } from '../../theme';

interface Props {
  pull: SharedValue<number>;
  refreshing: boolean;
  threshold?: number;
}

/**
 * The MARGIN word — stretches downward as the user pulls, italicizes
 * at the threshold, and oscillates gently while refreshing.
 */
export function MarginRefresh({ pull, refreshing, threshold = 80 }: Props) {
  const { colors } = useTheme();

  const idle = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      idle.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    } else {
      idle.value = withTiming(0, { duration: 240 });
    }
  }, [refreshing, idle]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = Math.max(0, pull.value);
    const stretch = interpolate(p, [0, threshold * 1.4], [1, 1.35], Extrapolation.CLAMP);
    const fade = interpolate(p, [0, 20], [0, 1], Extrapolation.CLAMP);
    const refreshFade = interpolate(idle.value, [0, 1], [0.85, 1]);
    const refreshScale = interpolate(idle.value, [0, 1], [1.0, 1.04]);

    return {
      transform: [{ scaleY: refreshing ? refreshScale : stretch }],
      opacity: refreshing ? refreshFade : fade,
    };
  });

  const italicProgress = useDerivedValue(() =>
    interpolate(pull.value, [threshold * 0.85, threshold * 1.1], [0, 1], Extrapolation.CLAMP),
  );

  const italicStyle = useAnimatedStyle(() => ({
    opacity: refreshing ? 1 : italicProgress.value,
  }));

  const uprightStyle = useAnimatedStyle(() => ({
    opacity: refreshing ? 0 : 1 - italicProgress.value,
  }));

  const baseStyle: TextStyle = {
    ...(type.display4 as TextStyle),
    fontFamily: fonts.serif,
    color: colors.ink,
    letterSpacing: 0.5,
  };

  const italicTextStyle: TextStyle = {
    ...baseStyle,
    fontFamily: fonts.serifItalic,
  };

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: space[3],
        height: 80,
      }}
    >
      <Animated.View style={animatedStyle}>
        <View>
          <Animated.Text allowFontScaling={false} style={[baseStyle, uprightStyle]}>
            MARGIN
          </Animated.Text>
          <Animated.Text
            allowFontScaling={false}
            style={[
              italicTextStyle,
              italicStyle,
              { position: 'absolute', top: 0, left: 0 },
            ]}
          >
            MARGIN
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}
