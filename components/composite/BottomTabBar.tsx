import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useTheme, space } from '../../theme';
import { AppIcon, type IconName } from '../primitives/AppIcon';
import { MicroLabel } from '../primitives/MicroLabel';
import { Txt } from '../primitives/Text';
import { HairlineRule } from '../primitives/HairlineRule';
import { useCreateSheetStore } from '../../state/createSheet';

// 4 visible tabs (the [+] center button is rendered between index #1 and #2).
const LABELS: Record<string, string> = {
  index: 'BOARDS',
  battles: 'BATTLES',
  clips: 'CLIPS',
  you: 'YOU',
};

const ICONS: Record<string, IconName> = {
  index: 'Trophy',
  battles: 'Swords',
  clips: 'Video',
  you: 'User',
};

const EASING = Easing.bezier(0.22, 1, 0.36, 1);

interface ItemProps {
  name: string;
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
}

function TabItem({ name, label, icon, active, onPress }: ItemProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, { duration: 100, easing: EASING });
  }, [active, progress]);

  const tone = active ? 'ember' : 'ash';
  const containerStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + progress.value * 0.3,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} tab`}
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: space[2],
        minHeight: 56,
      }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: 2 }, containerStyle]}>
        <AppIcon name={icon} size={26} tone={tone} filled={active} />
        <MicroLabel
          tone={active ? 'ink' : 'ash'}
          style={{
            color: active ? colors.ember : colors.ash,
            marginTop: 2,
          }}
        >
          {label}
        </MicroLabel>
      </Animated.View>
    </Pressable>
  );
}

interface CreateButtonProps {
  onPress: () => void;
}

function CreateButton({ onPress }: CreateButtonProps) {
  const { colors } = useTheme();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }],
    backgroundColor: pressed.value > 0.5 ? colors.emberPressed : colors.ember,
  }));

  return (
    <Pressable
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 90, easing: EASING });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 140, easing: EASING });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Create"
      style={{
        width: 64,
        height: 64,
        marginHorizontal: space[1],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.void,
            shadowOpacity: 0.15,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 6,
          },
          animatedStyle,
        ]}
      >
        <AppIcon name="Plus" size={32} tone="paper" />
      </Animated.View>
    </Pressable>
  );
}

interface ActionProps {
  icon: IconName;
  label: string;
  onPress: () => void;
}

function ActionRow({ icon, label, onPress }: ActionProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[4],
        paddingVertical: space[4],
        paddingHorizontal: space[5],
        backgroundColor: pressed ? colors.surface : 'transparent',
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppIcon name={icon} size={22} tone="ink" />
      </View>
      <Txt variant="bodyLg" weight="semibold">
        {label}
      </Txt>
    </Pressable>
  );
}

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sheetRef = useRef<BottomSheetModal>(null);
  const openStatEntry = useCreateSheetStore((s) => s.openStatEntry);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );

  const snapPoints = useMemo(() => ['38%'], []);

  // Build the visible tab list (Boards, Battles, Clips, You) in the registered
  // order from the navigator. The [+] button is rendered between #1 and #2.
  const visibleRoutes = state.routes.filter((r) => r.name in LABELS);

  const handleTabPress = (routeName: string, routeKey: string, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      (navigation.navigate as (name: string) => void)(routeName);
    }
  };

  const openCreateSheet = () => sheetRef.current?.present();
  const closeCreateSheet = () => sheetRef.current?.dismiss();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <View
        style={{
          backgroundColor: colors.paper,
          borderTopWidth: 1,
          borderTopColor: colors.fog,
          paddingBottom: insets.bottom > 0 ? insets.bottom : space[3],
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space[1],
          }}
        >
          {visibleRoutes.slice(0, 2).map((route) => {
            const isFocused = state.routes[state.index]?.name === route.name;
            return (
              <TabItem
                key={route.key}
                name={route.name}
                label={LABELS[route.name]}
                icon={ICONS[route.name]}
                active={isFocused}
                onPress={() => handleTabPress(route.name, route.key, isFocused)}
              />
            );
          })}

          <CreateButton onPress={openCreateSheet} />

          {visibleRoutes.slice(2).map((route) => {
            const isFocused = state.routes[state.index]?.name === route.name;
            return (
              <TabItem
                key={route.key}
                name={route.name}
                label={LABELS[route.name]}
                icon={ICONS[route.name]}
                active={isFocused}
                onPress={() => handleTabPress(route.name, route.key, isFocused)}
              />
            );
          })}
        </View>
      </View>

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.paper }}
        handleIndicatorStyle={{ backgroundColor: colors.ash }}
      >
        <BottomSheetView
          style={{
            paddingBottom: insets.bottom + space[4],
          }}
        >
          <View style={{ paddingHorizontal: space[5], paddingTop: space[2], paddingBottom: space[3] }}>
            <MicroLabel>CREATE</MicroLabel>
          </View>
          <HairlineRule />
          {/*
            Log stat dispatches into the existing StatEntrySheet via a tiny
            zustand pub/sub (`state/createSheet.ts`). Screens that mount a
            StatEntrySheet (currently /you) register a handler on mount.
          */}
          <ActionRow
            icon="Activity"
            label="Log stat"
            onPress={() => {
              closeCreateSheet();
              setTimeout(() => openStatEntry(), 180);
            }}
          />
          <ActionRow
            icon="MessageSquare"
            label="Post take"
            onPress={() => {
              closeCreateSheet();
              setTimeout(() => router.push('/takes/new'), 180);
            }}
          />
          <ActionRow
            icon="Target"
            label="Make call"
            onPress={() => {
              closeCreateSheet();
              setTimeout(() => router.push('/calls/new'), 180);
            }}
          />
          <ActionRow
            icon="Video"
            label="Add clip"
            onPress={() => {
              closeCreateSheet();
              setTimeout(() => router.push('/clips/new'), 180);
            }}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

