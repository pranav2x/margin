import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { type, useTheme, fonts } from '../../theme';

type Variant = keyof typeof type;

export interface TxtProps extends RNTextProps {
  variant?: Variant;
  italic?: boolean;
  tone?: 'ink' | 'ash' | 'paper' | 'shadow';
  inverted?: boolean;
  style?: TextStyle | TextStyle[];
}

export function Txt({ variant = 'body', italic, tone = 'ink', inverted, style, children, ...rest }: TxtProps) {
  const { colors } = useTheme();
  const base = type[variant];

  let color = colors.ink;
  if (tone === 'ash') color = colors.ash;
  else if (tone === 'paper') color = colors.paper;
  else if (tone === 'shadow') color = colors.shadow;

  if (inverted) {
    if (tone === 'ink') color = colors.paper;
    else if (tone === 'paper') color = colors.ink;
    else if (tone === 'ash') color = colors.fog;
  }

  const italicFamily =
    italic && base.fontFamily === fonts.serif ? fonts.serifItalic : base.fontFamily;

  return (
    <RNText
      {...rest}
      allowFontScaling={false}
      style={[base, { fontFamily: italicFamily, color }, style as TextStyle]}
    >
      {children}
    </RNText>
  );
}
