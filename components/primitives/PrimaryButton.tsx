import { View, Pressable, type PressableProps, type ViewStyle } from 'react-native';
import { Txt } from './Text';
import { useTheme } from '../../theme';
import { space } from '../../theme';
import * as Haptics from 'expo-haptics';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: 'primary' | 'ghost';
  full?: boolean;
  inverted?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  variant = 'primary',
  full,
  inverted,
  onPress,
  style,
  disabled,
  ...rest
}: Props) {
  const { colors } = useTheme();

  const filled = variant === 'primary';
  const bg = filled
    ? inverted
      ? colors.paper
      : colors.ink
    : 'transparent';
  const fg = filled
    ? inverted
      ? colors.ink
      : colors.paper
    : inverted
      ? colors.paper
      : colors.ink;
  const borderColor = inverted ? colors.paper : colors.ink;

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
          backgroundColor: bg,
          borderWidth: filled ? 0 : 1,
          borderColor,
          paddingVertical: space[4],
          paddingHorizontal: space[6],
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
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
