import { Text, type TextStyle } from 'react-native';
import { type, useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  inverted?: boolean;
  style?: TextStyle;
  tone?: 'ash' | 'ink' | 'error' | 'success';
}

export function MicroLabel({ children, inverted, style, tone = 'ash' }: Props) {
  const { colors } = useTheme();
  let color: string;
  if (tone === 'ink') color = inverted ? colors.paper : colors.ink;
  else if (tone === 'error') color = colors.error;
  else if (tone === 'success') color = colors.success;
  else color = inverted ? colors.fog : colors.ash;
  return <Text style={[type.micro, { color }, style]}>{children}</Text>;
}
