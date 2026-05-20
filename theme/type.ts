import type { TextStyle } from 'react-native';

export const fonts = {
  serif: 'InstrumentSerif',
  serifItalic: 'InstrumentSerifItalic',
  body: 'Geist',
  bodyMedium: 'GeistMedium',
  bodySemibold: 'GeistSemibold',
  mono: 'GeistMono',
  monoMedium: 'GeistMonoMedium',
} as const;

type Variant = TextStyle & {
  fontVariant?: TextStyle['fontVariant'];
};

export const type: Record<string, Variant> = {
  display1: {
    fontFamily: fonts.serif,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -1.5,
  },
  display2: {
    fontFamily: fonts.serif,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.2,
  },
  display3: {
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  display4: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
  },

  bodyLg: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodySm: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  micro: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  scoreXl: {
    fontFamily: fonts.monoMedium,
    fontSize: 64,
    lineHeight: 64,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  scoreLg: {
    fontFamily: fonts.monoMedium,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  scoreMd: {
    fontFamily: fonts.monoMedium,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  scoreSm: {
    fontFamily: fonts.mono,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
} as const;
