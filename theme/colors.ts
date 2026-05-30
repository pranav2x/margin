/**
 * Elevate — the only eight values that exist in this app.
 *
 * Depth comes from the tonal step paper → surface plus hairlines, never shadows.
 * ember is the single accent: reserved for action and achievement only (the
 * primary CTA, the winning side of a battle, the live dot, and — later — streak
 * flames and milestone celebrations). If you reach for a ninth color, you are
 * solving the wrong problem; use a surface tone or a hairline instead.
 *
 *   ink     — primary foreground (text, icons, ink fills)
 *   paper   — base background
 *   surface — second elevation tone, one step up from paper (cards, sheets)
 *   fog     — hairlines and the faintest fills
 *   ash     — secondary / muted foreground
 *   shadow  — inverted hairline / high-contrast divider
 *   ember   — the one accent (action + achievement)
 *   void    — true black (system edges)
 */

export interface ColorPalette {
  ink: string;
  paper: string;
  surface: string;
  fog: string;
  ash: string;
  shadow: string;
  ember: string;
  void: string;
}

export const lightColors: ColorPalette = {
  ink: '#0A0A0A',
  paper: '#F8F6F1',
  surface: '#F1EDE4',
  fog: '#E8E5DE',
  ash: '#8C8A85',
  shadow: '#2A2826',
  ember: '#D9430F',
  void: '#000000',
};

export const darkColors: ColorPalette = {
  ink: '#EDEAE3',
  paper: '#0F0E0C',
  surface: '#1A1815',
  fog: '#26241F',
  ash: '#6F6D68',
  shadow: '#D6D2C9',
  ember: '#FF5A2C',
  void: '#000000',
};
