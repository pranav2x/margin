import { Text, type TextStyle } from 'react-native';
import { type, useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  inverted?: boolean;
  style?: TextStyle;
  tone?: 'ash' | 'ink';
}

export function MicroLabel({ children, inverted, style, tone = 'ash' }: Props) {
  const { colors } = useTheme();
  const color = tone === 'ink' ? (inverted ? colors.paper : colors.ink) : inverted ? colors.fog : colors.ash;
  return <Text style={[type.micro, { color }, style]}>{children}</Text>;
}
