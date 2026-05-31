/**
 * Elevate — corner radius scale. Consistency is the point: pick from this
 * scale and never deviate. Generous (12–16) on cards reads friendly without
 * looking like a toy.
 *
 *   xs   →  4  checkboxes, tiny inline pills
 *   sm   →  8  chips, small buttons, inputs
 *   md   → 12  buttons, list rows
 *   lg   → 16  cards
 *   xl   → 24  sheets, hero cards
 *   full → 9999  pills, avatars
 */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
