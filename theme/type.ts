import type { TextStyle } from 'react-native';

/**
 * Elevate — Inter-only type system (Strava-faithful).
 *
 * Five weights: 400 / 500 / 600 / 700 / 800.
 * Score numerals use tabular-nums so 9 → 10 never shifts horizontally.
 *
 * Family aliases are stable contracts — never inline a raw family string in a
 * screen; always reach for `fonts.regular` (etc.) so a future font swap is one
 * file. The `Inter_NNNWeight` values match the keys passed to `useFonts()` in
 * `app/_layout.tsx` exactly.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

type Variant = TextStyle & {
  fontVariant?: TextStyle['fontVariant'];
};

export const type = {
  // Hero numerals + hero headlines.
  display1: {
    fontFamily: fonts.extrabold,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.0,
  },
  display2: {
    fontFamily: fonts.extrabold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.6,
  },
  display3: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  display4: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.2,
  },

  bodyLg: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  micro: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Score numerals — Inter Tabular. Used for stat values, scores, day counts.
  scoreXl: {
    fontFamily: fonts.extrabold,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.0,
    fontVariant: ['tabular-nums'],
  },
  scoreLg: {
    fontFamily: fonts.extrabold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  scoreMd: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  scoreSm: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, Variant>;

export type TypeVariant = keyof typeof type;
