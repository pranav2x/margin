/**
 * Elevate — color tokens (dark-first, spec-aligned).
 *
 * The public names (ink, paper, surface, fog, ash, shadow, ember, void,
 * emberPressed, plus new overlay/popover/emberOnDark/textDisabled and the four
 * semantic tokens) are the STABLE INTERFACE every screen and primitive imports.
 * Do not rename them. The underlying hexes are the canonical spec values from
 * DESIGN_SPEC.md; see DESIGN_RULES.md for the legacy-name ↔ spec-name mapping.
 *
 * Dark-mode-first. Depth comes from lighter surface tiers
 * (paper → surface → overlay → popover), never from drop shadows or borders.
 *
 * Mapping (dark mode is the source of truth):
 *   ink          → text.primary       (#FFFFFF)
 *   ash          → text.secondary     (white @ 70%)
 *   shadow       → text.tertiary      (white @ 50%)   *also used for muted
 *                                                       icons & strong dividers
 *   textDisabled → text.disabled      (white @ 30%)
 *   fog          → divider            (white @ 8%)
 *   paper        → surface.base       (#0B0F12)
 *   surface      → surface.raised     (#15191D)
 *   overlay      → surface.overlay    (#1E242A) — nested cards, active rows
 *   popover      → surface.popover    (#272E35) — modals, sheets, dropdowns
 *   ember        → accent.default     (#FC4C02)
 *   emberOnDark  → accent.onDark      (#FF6A2B)
 *   emberPressed → accent.pressed     (#CC4200)
 *   void         → pure black         (#000000) — system edges, shadowColor only
 *   success / warning / error / info  → Apple-system semantic colors (dark tuned)
 */

export interface ColorPalette {
  // text
  ink: string;
  ash: string;
  shadow: string;
  textDisabled: string;
  // surfaces (4 elevation tiers — depth via lighter, not shadowed)
  paper: string;
  surface: string;
  overlay: string;
  popover: string;
  // structure
  fog: string;
  void: string;
  // accent (single)
  ember: string;
  emberOnDark: string;
  emberPressed: string;
  // semantic (fixed meanings — never decorative)
  success: string;
  warning: string;
  error: string;
  info: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dark (default, dark-first — the design target)
// ──────────────────────────────────────────────────────────────────────────────
export const darkColors: ColorPalette = {
  // text — white at descending opacity (Material method, ≥15.8:1 on paper)
  ink: '#FFFFFF',
  ash: 'rgba(255,255,255,0.70)',
  shadow: 'rgba(255,255,255,0.50)',
  textDisabled: 'rgba(255,255,255,0.30)',

  // surfaces — four elevation tiers, each ~5–8% lighter than the one below
  paper: '#0B0F12',
  surface: '#15191D',
  overlay: '#1E242A',
  popover: '#272E35',

  // structure
  fog: 'rgba(255,255,255,0.08)',
  void: '#000000',

  // accent — Strava Tangelo; slightly brighter onDark variant for small text
  ember: '#FC4C02',
  emberOnDark: '#FF6A2B',
  emberPressed: '#CC4200',

  // semantic — Apple system colors, dark-tuned
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  info: '#0A84FF',
};

// ──────────────────────────────────────────────────────────────────────────────
// Light (kept functional — not the current design target. Same NAMES, light values.)
// ──────────────────────────────────────────────────────────────────────────────
export const lightColors: ColorPalette = {
  ink: '#1A1A1A',
  ash: 'rgba(0,0,0,0.65)',
  shadow: 'rgba(0,0,0,0.45)',
  textDisabled: 'rgba(0,0,0,0.30)',

  paper: '#FFFFFF',
  surface: '#F7F7F7',
  overlay: '#EFEFEF',
  popover: '#FAFAFA',

  fog: 'rgba(0,0,0,0.08)',
  void: '#000000',

  ember: '#FC4C02',
  emberOnDark: '#FC4C02',
  emberPressed: '#CC4200',

  success: '#34C759',
  warning: '#FFCC00',
  error: '#FF3B30',
  info: '#007AFF',
};
