import { useCallback, type ReactNode } from 'react';
import { Pressable, type PressableProps, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: ViewStyle | ViewStyle[];
  scale?: number;
  haptic?: 'none' | 'light' | 'medium';
  children?: ReactNode;
}

const ease = Easing.bezier(0.22, 1, 0.36, 1);

export function PressableScale({
  children,
  style,
  scale = 0.985,
  haptic = 'light',
  onPress,
  ...rest
}: Props) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: o.value,
  }));

  const handlePressIn = useCallback(() => {
    s.value = withTiming(scale, { duration: 120, easing: ease });
    o.value = withTiming(0.85, { duration: 120, easing: ease });
    if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [s, o, scale, haptic]);

  const handlePressOut = useCallback(() => {
    s.value = withTiming(1, { duration: 180, easing: ease });
    o.value = withTiming(1, { duration: 180, easing: ease });
  }, [s, o]);

  return (
    <Pressable {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
      <Animated.View style={[animatedStyle, style as ViewStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
