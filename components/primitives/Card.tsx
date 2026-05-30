import { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { space, radius, useTheme } from '../../theme';

interface Props {
  children: ReactNode;
  padded?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  /** Elevation tier. `paper` = bg, `surface` = raised card, `overlay` = nested. */
  tone?: 'paper' | 'surface' | 'overlay';
  style?: ViewStyle;
}

/**
 * Rounded container, `radius.lg` (16) by spec. Elevation is the lighter
 * surface beneath — no shadow, no border. `padded` adds 16px inset;
 * `pressable` wraps in PressableScale.
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
  const bg =
    tone === 'paper' ? colors.paper : tone === 'overlay' ? colors.overlay : colors.surface;
  const containerStyle: ViewStyle = {
    backgroundColor: bg,
    borderRadius: radius.lg,
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
