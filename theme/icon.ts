/**
 * Elevate — icon constants. ONE icon library (lucide-react-native), ONE stroke
 * width, fixed sizes on the 8/4 grid. Color is always `currentColor` (inherits
 * from the text color of the parent). Never mix emoji, logos, or other icon
 * sets into UI chrome.
 *
 *   stroke       2px  — Lucide default; the same width across the entire app
 *   sizes.sm    16    — inline / dense
 *   sizes.md    20    — default UI
 *   sizes.lg    24    — tab bar, primary actions
 *   sizes.xl    32    — feature / hero
 */
export const icon = {
  stroke: 2,
  sizes: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
} as const;

export type IconSize = keyof typeof icon.sizes;
