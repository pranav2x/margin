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
  tone?: 'ink' | 'ash' | 'paper';
  style?: TextStyle;
}

export function Score({ value, size = 'md', inverted, tone = 'ink', style }: Props) {
  const { colors } = useTheme();
  let color = colors.ink;
  if (tone === 'ash') color = colors.ash;
  if (tone === 'paper') color = colors.paper;
  if (inverted) {
    if (tone === 'ink') color = colors.paper;
    if (tone === 'paper') color = colors.ink;
  }
  const v = type[sizeMap[size]];
  return (
    <Text
      allowFontScaling={false}
      style={[v as TextStyle, { color, fontFamily: v.fontFamily ?? fonts.monoMedium }, style]}
    >
      {value}
    </Text>
  );
}
