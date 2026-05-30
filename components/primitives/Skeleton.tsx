import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme, radius as r, motion } from '../../theme';

/**
 * Skeleton — shimmer placeholder for loading states. Per spec, use these
 * instead of spinners; match the eventual content's footprint (a row, a
 * stat, a card) so the transition into real content doesn't shift layout.
 *
 *   <Skeleton w={120} h={16} />          // a single text line
 *   <Skeleton h={64} radius="lg" />      // a card placeholder
 */

type RadiusKey = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface Props {
  /** Width in px. `undefined` = flex (fills parent). */
  w?: number | `${number}%`;
  /** Height in px. Defaults to 14 (single line of body text). */
  h?: number;
  radius?: RadiusKey;
  style?: ViewStyle;
}

export function Skeleton({ w, h = 14, radius: radiusKey = 'sm', style }: Props) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: motion.slow * 3, easing: motion.easeInOut }),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: w as number | undefined,
          height: h,
          backgroundColor: colors.surface,
          borderRadius: r[radiusKey],
        },
        animatedStyle,
        style as ViewStyle,
      ]}
    >
      {/* Fallback static block for static contexts (RNW screenshots, etc). */}
      <View />
    </Animated.View>
  );
}
