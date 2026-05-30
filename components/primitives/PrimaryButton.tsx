import { View, Pressable, type PressableProps, type ViewStyle } from 'react-native';
import { Txt } from './Text';
import { useTheme } from '../../theme';
import { space } from '../../theme';
import * as Haptics from 'expo-haptics';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: 'primary' | 'ghost';
  /** Compact = 40h (used in dense rows); default = 48h Strava CTA */
  size?: 'default' | 'compact';
  full?: boolean;
  inverted?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  variant = 'primary',
  size = 'default',
  full,
  inverted,
  onPress,
  style,
  disabled,
  ...rest
}: Props) {
  const { colors } = useTheme();

  const filled = variant === 'primary';
  // Primary = filled ember (paper label). Ghost = ink outline on paper bg.
  // The inverted filled variant flips to paper-on-ink (unused today but kept).
  const bg = filled
    ? inverted
      ? colors.paper
      : colors.ember
    : colors.paper;
  const fg = filled
    ? inverted
      ? colors.ink
      : colors.paper
    : inverted
      ? colors.paper
      : colors.ink;
  const borderColor = filled ? 'transparent' : inverted ? colors.paper : colors.ink;
  const pressedBg = filled
    ? inverted
      ? colors.fog
      : colors.emberPressed
    : colors.surface;

  const height = size === 'compact' ? 40 : 48;

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          backgroundColor: pressed && !disabled ? pressedBg : bg,
          borderWidth: filled ? 0 : 1,
          borderColor,
          borderRadius: 12,
          minHeight: height,
          paddingHorizontal: space[5],
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <Txt variant="label" style={{ color: fg, letterSpacing: 0.6 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function GhostButton(props: Omit<Props, 'variant'>) {
  return <PrimaryButton {...props} variant="ghost" />;
}

export function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: space[3] }}>{children}</View>;
}
