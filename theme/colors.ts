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
 *   ember   — the one accent (action + achievement) — Strava orange
 *   void    — true black (system edges)
 *
 *   emberPressed — pressed/active state for the ember CTA (added Phase 1)
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
  emberPressed: string;
}

export const lightColors: ColorPalette = {
  ink: '#1A1A1A',
  paper: '#FFFFFF',
  surface: '#F7F7F7',
  fog: '#E5E5E5',
  ash: '#6B6B6B',
  shadow: '#8E8E93',
  ember: '#FC5200',
  void: '#000000',
  emberPressed: '#CC4200',
};

export const darkColors: ColorPalette = {
  ink: '#F5F5F5',
  paper: '#121212',
  surface: '#1E1E1E',
  fog: '#2A2A2A',
  ash: '#A0A0A0',
  shadow: '#8E8E93',
  ember: '#FC5200',
  void: '#000000',
  emberPressed: '#CC4200',
};
