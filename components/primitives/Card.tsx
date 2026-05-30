import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { space, useTheme } from '../../theme';

interface Props {
  children: ReactNode;
  padded?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  tone?: 'surface' | 'paper';
  style?: ViewStyle;
}

/**
 * Strava-style rounded container. radius=12, 1px fog border, surface bg.
 * `padded` adds 16px inset; `pressable` wraps in PressableScale.
 */
export function Card({
  children,
  padded = false,
  pressable = false,
  onPress,
  tone = 'surface',
  style,
}: Props) {
  const { colors } = useTheme();
  const containerStyle: ViewStyle = {
    backgroundColor: tone === 'paper' ? colors.paper : colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.fog,
    padding: padded ? space[4] : 0,
    overflow: 'hidden',
  };

  if (pressable) {
    return (
      <PressableScale onPress={onPress} style={[containerStyle, style ?? {}]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[containerStyle, style]}>{children}</View>;
}
