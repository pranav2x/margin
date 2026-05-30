import { Easing } from 'react-native-reanimated';

/**
 * Elevate — motion tokens (spec-aligned).
 *
 * Spec defaults (DESIGN_SPEC.md §6): micro-interactions snap in 150–300ms
 * with ease-in-out. Press states respond within 100–150ms. `glacial` is kept
 * for the share-card celebration sequence only.
 *
 *   fast    150  — press states, taps
 *   base    200  — default UI transitions (snappy, not sluggish)
 *   slow    300  — sheets, modal entry
 *   glacial 800  — celebration sequences only
 */
export const motion = {
  // easing curves
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  easeInOut: Easing.bezier(0.65, 0, 0.35, 1),
  spring: { damping: 22, stiffness: 180, mass: 0.6 },

  // durations (ms) — spec-aligned
  fast: 150,
  base: 200,
  slow: 300,
  glacial: 800,
} as const;
