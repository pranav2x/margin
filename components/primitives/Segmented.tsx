import { useEffect, useMemo } from 'react';
import { View, Pressable, type LayoutChangeEvent } from 'react-native';
import { useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Txt } from './Text';
import { useTheme, space, radius, motion } from '../../theme';

/**
 * Segmented — 2-5 option segmented control with a sliding ink pill.
 *
 * Strava pattern: a fog-filled rail, the active segment sits on an ink-tinted
 * inner pill, ash labels on inactive and ink on active. The pill animates
 * between positions so the eye can follow scope changes (My School ↔
 * Nearby ↔ Everyone).
 */

interface Option<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (next: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  const [railWidth, setRailWidth] = useState(0);
  const activeIndex = useMemo(
    () => Math.max(0, options.findIndex((o) => o.key === value)),
    [options, value],
  );
  const segmentWidth = railWidth > 0 ? railWidth / options.length : 0;
  const x = useSharedValue(activeIndex * segmentWidth);

  useEffect(() => {
    x.value = withTiming(activeIndex * segmentWidth, {
      duration: motion.fast,
      easing: motion.easeOut,
    });
  }, [activeIndex, segmentWidth, x]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: segmentWidth - 4,
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setRailWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.full,
        padding: 2,
        height: 40,
        position: 'relative',
      }}
    >
      {railWidth > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 2,
              left: 2,
              bottom: 2,
              borderRadius: radius.full,
              // Active pill is LIGHTER than its rail (depth via elevation, not shadow).
              backgroundColor: colors.overlay,
            },
            pillStyle,
          ]}
        />
      ) : null}
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: space[2],
            }}
          >
            <Txt
              variant="bodySm"
              weight={active ? 'bold' : 'semibold'}
              tone={active ? 'ink' : 'ash'}
            >
              {opt.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
