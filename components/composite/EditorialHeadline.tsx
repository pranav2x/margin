import { memo } from 'react';
import { type TextStyle } from 'react-native';
import { Txt } from '../primitives/Text';
import { fonts, type as typeTokens } from '../../theme';

type Variant = 'display1' | 'display2' | 'display3' | 'display4';

interface Props {
  text: string;
  italicTokens?: string[];
  variant?: Variant;
  inverted?: boolean;
  style?: TextStyle;
}

/**
 * Renders an Instrument Serif headline with a curated set of words
 * rendered in italic. Tokens match whole words (case-insensitive).
 */
export const EditorialHeadline = memo(function EditorialHeadline({
  text,
  italicTokens,
  variant = 'display3',
  inverted,
  style,
}: Props) {
  if (!italicTokens || italicTokens.length === 0) {
    return (
      <Txt variant={variant} inverted={inverted} style={style}>
        {text}
      </Txt>
    );
  }

  const lower = italicTokens.map((t) => t.toLowerCase());
  const parts = text.split(/(\s+|[,.;:?!])/g);

  return (
    <Txt variant={variant} inverted={inverted} style={style}>
      {parts.map((part, i) => {
        const stripped = part.replace(/[.,;:?!]/g, '').toLowerCase();
        const isItalic = lower.includes(stripped);
        if (!isItalic) return part;
        const v = typeTokens[variant];
        return (
          <Txt
            key={i}
            variant={variant}
            italic
            inverted={inverted}
            style={{ fontFamily: fonts.serifItalic, fontSize: v.fontSize, lineHeight: v.lineHeight }}
          >
            {part}
          </Txt>
        );
      })}
    </Txt>
  );
});
