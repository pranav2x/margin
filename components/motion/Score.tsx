import { Text, type TextStyle } from 'react-native';
import { type, useTheme, fonts } from '../../theme';

type SizeKey = 'xl' | 'lg' | 'md' | 'sm';
const sizeMap: Record<SizeKey, keyof typeof type> = {
  xl: 'scoreXl',
  lg: 'scoreLg',
  md: 'scoreMd',
  sm: 'scoreSm',
};

interface Props {
  value: string | number;
  size?: SizeKey;
  inverted?: boolean;
  tone?: 'ink' | 'ash' | 'paper' | 'ember';
  style?: TextStyle;
}

/**
 * Static numeric display. Inter tabular-nums, so 9 → 10 never shifts.
 * Tone defaults to `ink`; pass `ember` for the one-accent stat per screen.
 */
export function Score({ value, size = 'md', inverted, tone = 'ink', style }: Props) {
  const { colors } = useTheme();
  let color: string = colors.ink;
  if (tone === 'ash') color = colors.ash;
  else if (tone === 'paper') color = colors.paper;
  else if (tone === 'ember') color = colors.ember;
  if (inverted) {
    if (tone === 'ink') color = colors.paper;
    if (tone === 'paper') color = colors.ink;
  }
  const v = type[sizeMap[size]];
  return (
    <Text
      allowFontScaling={false}
      style={[
        v as TextStyle,
        { color, fontFamily: v.fontFamily ?? fonts.extrabold, fontVariant: ['tabular-nums'] },
        style,
      ]}
    >
      {value}
    </Text>
  );
}
