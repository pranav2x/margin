# The Elevate Design Spec: An Award-Winning Pattern Reference for a Gen Z Sports App

## TL;DR
- **Go dark-first, type-led, and ruthlessly monochrome with ONE accent.** The apps you admire (Whoop, Strava dark mode, Linear, Cal AI) share a single recipe: a near-black (not pure-black) canvas built on 4 surface elevation tiers, ~90% neutral / ~10% accent color, big tightly-tracked numbers in one variable sans (use Inter), a single-weight icon set (use Lucide), an 8pt spacing grid, and tiny haptic/motion details. "Minimal but not empty" comes from filling space with REAL DATA and hierarchy, not whitespace.
- **The difference between "designed" and "AI template" is specificity and restraint.** AI slop = purple-blue gradients, neon-on-black, glassmorphism, three button variants, lorem ipsum, and an accent color used everywhere. Award-winning = exactly one accent used on <10% of pixels, real content shaping layout, and obsessive consistency of spacing/radii/stroke.
- **Feed the AI agent exact tokens, never adjectives.** "Make it better" fails because the model averages its training data (→ generic). Hard hex values, pt sizes, and named components in a committed `theme.ts` + a rules file force the agent to build inside YOUR system. Use Stitch only for rough layout exploration (it produces generic neon), Nano Banana for illustration assets only, and NativeWind or Tamagui as the token-driven styling layer.

## Key Findings

1. **Dark-first is the premium default.** Linear, Arc, Warp, Raycast and Whoop all launched dark-first; their light mode is secondary. Use near-black, never pure black, as your base.
2. **Surface elevation is what makes dark mode look expensive.** A real dark theme needs at least 4 surface tiers, each ~5–8% lighter than the one below. "One shade of dark grey is a grey app, not a dark mode."
3. **One accent, used sparingly (60/30/10).** ~60% dominant neutral, ~30% secondary neutral, ~10% accent reserved for the single most important action/metric on a screen.
4. **Type-led, not decoration-led.** Use ONE variable sans (Inter) at multiple weights; create hierarchy with size + weight + tight tracking on big numbers, not with multiple fonts or colors.
5. **8pt grid + consistent radii = calm density.** Everything is a multiple of 8 (with a 4pt half-step). Density feels calm when spacing is rhythmic and internal padding ≤ external spacing.
6. **Single-weight icon set beats emoji.** Lucide (1px–2px stroke, 24px grid) is the modern standard; never mix emoji, logos, and icons.
7. **Micro-details signal quality.** 150–300ms transitions, ease-in-out, press states, haptics on key actions, and skeleton loaders instead of spinners.
8. **AI tools produce "slop" by default; tokens are the cure.** Give the coding agent exact values and named libraries.

## 1. Color systems

- Near-black (`#0B0F12`), never pure black.
- 4 surface elevation tiers — each ~5–8% lighter than the one below:
  - `surface/base` `#0B0F12` (app bg)
  - `surface/raised` `#15191D` (cards, panels)
  - `surface/overlay` `#1E242A` (nested, active rows)
  - `surface/popover` `#272E35` (modals, sheets)
- Text: white at descending opacity (100 / 70 / 50 / 30%). Target ≥15.8:1
  primary text on base.
- ONE accent: `#FC4C02` (Strava Tangelo). `#FF6A2B` on-dark variant.
  ≤10% of screen pixels. Primary CTA / active / single hero metric.
- Semantic colors (Apple system, dark-tuned): `#30D158` success, `#FFD60A`
  warning, `#FF453A` error, `#0A84FF` info.
- Pattern: 60% base / 30% secondary surfaces & neutral text / 10% accent.
- Whoop-style fixed-meaning colors: each color carries one meaning, never
  decorative.

## 2. Typography

- Inter only (variable). Load via `expo-font`.
- Tabular figures (`fontVariant: ['tabular-nums']`) for any number / column.
- Hierarchy via size + weight + tracking — never via additional families.
- Display sizes (≥28pt) get negative letter-spacing (−1% to −3%).
- iOS HIG-aligned scale (display / largeTitle / title1–3 / headline / body /
  callout / subhead / footnote / caption1–2).
- Body floor 16–17pt. Caption floor 11pt.

## 3. Spacing, grid & density

- 8pt grid with 4pt half-step. Scale `0/4/8/12/16/24/32/40/48/64`.
- Radius scale: `sm 8 / md 12 / lg 16 / xl 24 / full 9999`.
- Card padding 16–20. Row vertical padding 12–16, min 44pt height.
- Gestalt rule: internal padding ≤ external spacing so groups read as units.
- "Calm density": dense layouts (Whoop, Linear) feel calm because the rhythm
  is consistent — hierarchy and alignment carry the eye.
- Minimal ≠ empty. Fill with real content and hierarchy.

## 4. Iconography

- Lucide (`lucide-react-native`). 1600+ icons on a 24×24 grid with 2px stroke.
- One stroke width, one library. Color inherits via `currentColor`.
- Sizes: 16 / 20 / 24 / 32 only. NO emoji, NO logos as icons.

## 5. Component & layout patterns

- **Segmented control** ≠ **Tabs** ≠ **Chips.** Segmented = re-scope same
  content (≤5 options). Tabs = different content. Chips = filter open set.
- Max two visible selection rows per screen (primary + secondary).
- Horizontal scrollers: peek the next card ~16–24px or use an edge fade.
  Snap. Never rely on a scrollbar.
- Cards: `surface/raised`, `radius/lg` (16), padding 16–20, one clear hero.
- List rows: min 44–56pt; leading icon/avatar; title (headline) + subtitle
  (subhead 70%); trailing value or chevron; separator at 8% white.
- Leaderboard: rank (tabular bold) | avatar + name | metric (tabular). Accent
  ONLY for #1 or the current user. Current user row: `surface/overlay`.
- Tab bar: 3–5 items, 24px icons, label caption2, active = accent + filled
  icon, inactive = white@60% + outline icon.
- Sticky headers: collapse large title to compact on scroll.
- Empty states: simple illustration / large icon + on-voice line + primary
  CTA. Never blank.

## 6. Motion & polish

- Micro-interactions 150–300ms (target 200ms). Ease-in-out.
- Press states: scale 0.97 or surface-lighten in <150ms.
- Haptics on key actions (`expo-haptics`): light on tap, medium on
  log/PR, success on achievement.
- Loading: skeleton screens matching final layout, not spinners.
- One celebration moment per real achievement (scale-pop + success haptic).
- Respect `prefers-reduced-motion`.

## 7. The "award-winning" thesis — 8 principles

1. Dark-first, near-black canvas with real elevation tiers.
2. One accent, ≤10% of pixels, every color carries meaning.
3. Type does the work.
4. Rhythm over randomness.
5. Density that's calm, not sparse.
6. Consistency is the moat.
7. Micro-details = perceived quality.
8. Designed states, not just the happy path.

## 8. Instructing AI agents

- Lock tokens in `theme/` before any UI. Commit `DESIGN_RULES.md` as hard rules.
- Build 2–3 "golden" reference screens by hand first; agent imitates better
  than it invents.
- Give surgical, specific instructions referencing tokens — never adjectives.
- Reset context often.

## Tooling

- **Expo + NativeWind** (or token-typed RN style helpers) + Lucide + Inter +
  expo-haptics. Most AI-agent-friendly, least likely to drift into generic.
- AI image models for illustration ONLY, never for UI layout.
- Avoid Material-flavored libraries (React Native Paper) for this look.

## Caveats

- Surface hexes are recommended on-system values, not extracted from a
  specific app. Verified brand values: Strava `#FC4C02`; Whoop recovery
  `#16EC06 / #FFDE00 / #FF0026`; Linear `#08090A` bg.
- Trend statements reflect 2024–2026 design-community consensus.
- Apple type scale is a starting point; tune to Inter with real content.
- Accessibility is non-negotiable: ≥4.5:1 body text, 44pt touch targets,
  Dynamic Type support.
