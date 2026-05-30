import { useEffect } from 'react';
import { View, Pressable, Platform, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Trophy, Swords, User, type LucideIcon } from 'lucide-react-native';
import { fonts, useTheme, space } from '../../theme';
import { HairlineRule } from '../primitives/HairlineRule';

const LABELS: Record<string, string> = {
  index: 'boards',
  battles: 'battles',
  you: 'you',
};

// One calm hairline icon per tab, above the brand wordmark.
const ICONS: Record<string, LucideIcon> = {
  index: Trophy,
  battles: Swords,
  you: User,
};

interface ItemProps {
  label: string;
  name: string;
  active: boolean;
  onPress: () => void;
  color: string;
  activeColor: string;
}

function TabItem({ label, name, active, onPress, color, activeColor }: ItemProps) {
  const Icon = ICONS[name];
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [active, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: active ? 1 : 1,
  }));

  const activeStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.96 + progress.value * 0.04 }],
  }));

  const inactiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space[3],
        minHeight: 56,
      }}
    >
      {/* Hairline icon above the wordmark. Fixed box + two crossfading copies
          (ink active / ash inactive) so the active state never shifts layout. */}
      {Icon ? (
        <View style={{ width: 24, height: 24, marginBottom: space[1], alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[{ position: 'absolute' }, activeStyle]}>
            <Icon size={22} color={activeColor} strokeWidth={1.5} />
          </Animated.View>
          <Animated.View style={[{ position: 'absolute' }, inactiveStyle]}>
            <Icon size={22} color={color} strokeWidth={1.5} />
          </Animated.View>
        </View>
      ) : null}
      <Animated.View style={[{ position: 'relative', height: 26, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
        <Animated.Text
          allowFontScaling={false}
          style={[
            {
              fontFamily: fonts.serifItalic,
              fontSize: 19,
              lineHeight: 26,
              color: activeColor,
              position: 'absolute',
              letterSpacing: 0.2,
            },
            activeStyle,
          ]}
        >
          {label}
        </Animated.Text>
        <Animated.Text
          allowFontScaling={false}
          style={[
            {
              fontFamily: fonts.serif,
              fontSize: 15,
              lineHeight: 26,
              color,
              position: 'absolute',
              letterSpacing: 0.2,
            },
            inactiveStyle,
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <HairlineRule />
      <BlurView
        intensity={Platform.OS === 'ios' ? 30 : 0}
        tint={isDark ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={{
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.paper,
        }}
      >
        <View
          style={{
            backgroundColor: colors.paper,
            opacity: Platform.OS === 'ios' ? 0.9 : 1,
            ...StyleSheet.absoluteFillObject,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            paddingBottom: insets.bottom > 0 ? insets.bottom : space[3],
          }}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                (navigation.navigate as (name: string, params?: unknown) => void)(
                route.name,
                route.params,
              );
              }
            };
            const label = LABELS[route.name] ?? route.name;
            return (
              <TabItem
                key={route.key}
                label={label}
                name={route.name}
                active={isFocused}
                onPress={onPress}
                color={colors.ash}
                activeColor={colors.ink}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}
