import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { type, useTheme, fonts, type TypeVariant } from '../../theme';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const weightToFamily: Record<Weight, string> = {
  regular: fonts.regular,
  medium: fonts.medium,
  semibold: fonts.semibold,
  bold: fonts.bold,
  extrabold: fonts.extrabold,
};

export interface TxtProps extends RNTextProps {
  variant?: TypeVariant;
  /**
   * @deprecated Instrument Serif italic is gone — historic `italic` prop now
   * promotes the text to a semibold weight so emphasis is preserved without
   * breaking the dozens of existing call sites. Prefer `weight="semibold"` for
   * new code.
   */
  italic?: boolean;
  /** Explicit Inter weight override. Wins over `italic` if both are set. */
  weight?: Weight;
  tone?: 'ink' | 'ash' | 'paper' | 'shadow' | 'ember' | 'error' | 'success';
  inverted?: boolean;
  style?: TextStyle | TextStyle[];
}

export function Txt({
  variant = 'body',
  italic,
  weight,
  tone = 'ink',
  inverted,
  style,
  children,
  ...rest
}: TxtProps) {
  const { colors } = useTheme();
  const base = type[variant];

  let color: string = colors.ink;
  if (tone === 'ash') color = colors.ash;
  else if (tone === 'paper') color = colors.paper;
  else if (tone === 'shadow') color = colors.shadow;
  else if (tone === 'ember') color = colors.ember;
  else if (tone === 'error') color = colors.error;
  else if (tone === 'success') color = colors.success;

  if (inverted) {
    if (tone === 'ink') color = colors.paper;
    else if (tone === 'paper') color = colors.ink;
    else if (tone === 'ash') color = colors.fog;
  }

  // Weight wins over italic. Italic is a legacy no-op that bumps to semibold
  // to preserve emphasis the serif-italic used to carry.
  const explicitWeight: Weight | undefined = weight ?? (italic ? 'semibold' : undefined);
  const family = explicitWeight ? weightToFamily[explicitWeight] : base.fontFamily;

  return (
    <RNText
      {...rest}
      allowFontScaling={false}
      style={[base, { fontFamily: family, color }, style as TextStyle]}
    >
      {children}
    </RNText>
  );
}
