# Elevate Design Rules

Read before editing any UI. Full rationale lives in `DESIGN_SPEC.md`.

## Source of truth

- Source of truth: `theme/` (`colors.ts`, `space.ts`, `radius.ts`, `type.ts`,
  `icon.ts`, `motion.ts`). Re-exported from `theme/index.ts`.
- **Never write a raw hex, raw px, or off-grid spacing value in a component.**
  If a token doesn't exist, add it to `theme/` — do not inline it.
- One source of truth: this repo uses the **existing token names**
  (`ink`, `paper`, `surface`, `fog`, `ash`, `shadow`, `ember`, etc.). The hex
  values underneath are the spec values from `DESIGN_SPEC.md`. **Do not
  introduce a parallel `surface.base` / `text.primary` namespace.** See mapping
  below.

## Name mapping — existing name ↔ spec name

When the spec or a subagent talks about `surface.raised` or `text.primary`, use
the existing name in code. Hexes are identical.

| Existing token (use this in code) | Spec name (in DESIGN_SPEC.md) | Dark hex / value           | Role                                                  |
| --------------------------------- | ----------------------------- | -------------------------- | ----------------------------------------------------- |
| `colors.paper`                    | `surface.base`                | `#0B0F12`                  | App background. Near-black, never pure black.         |
| `colors.surface`                  | `surface.raised`              | `#15191D`                  | Cards, panels.                                        |
| `colors.overlay` *(new)*          | `surface.overlay`             | `#1E242A`                  | Nested cards, active/highlighted rows (current user). |
| `colors.popover` *(new)*          | `surface.popover`             | `#272E35`                  | Modals, sheets, dropdowns.                            |
| `colors.ink`                      | `text.primary`                | `#FFFFFF`                  | Primary text, primary icons.                          |
| `colors.ash`                      | `text.secondary`              | `rgba(255,255,255,0.70)`   | Secondary text, subtitles.                            |
| `colors.shadow`                   | `text.tertiary`               | `rgba(255,255,255,0.50)`   | Tertiary text, muted icons, strong dividers.          |
| `colors.textDisabled` *(new)*     | `text.disabled`               | `rgba(255,255,255,0.30)`   | Disabled text & controls.                             |
| `colors.fog`                      | `divider`                     | `rgba(255,255,255,0.08)`   | Hairlines, faintest fills.                            |
| `colors.ember`                    | `accent.default`              | `#FC4C02`                  | THE single accent. Primary CTA / active / hero metric.|
| `colors.emberOnDark` *(new)*      | `accent.onDark`               | `#FF6A2B`                  | Slightly brighter accent for small text on dark.      |
| `colors.emberPressed`             | `accent.pressed`              | `#CC4200`                  | Pressed/active state of the accent CTA.               |
| `colors.void`                     | (pure black)                  | `#000000`                  | System edges, `shadowColor` ONLY.                     |
| `colors.success`  *(new)*         | `semantic.success`            | `#30D158`                  | Achievement / positive state.                         |
| `colors.warning`  *(new)*         | `semantic.warning`            | `#FFD60A`                  | Caution.                                              |
| `colors.error`    *(new)*         | `semantic.error`              | `#FF453A`                  | Destructive / error.                                  |
| `colors.info`     *(new)*         | `semantic.info`               | `#0A84FF`                  | Informational.                                        |

Light mode keeps the same names with appropriate light values; dark mode is the
design target. Light may be removed in a later phase.

## Hard rules (never violate)

1. **Dark-first.** Base `colors.paper` (`#0B0F12`). Four surface tiers; an
   elevated surface is **lighter**, not shadowed.
2. **One accent (`colors.ember`), ≤10% of pixels.** Primary CTA, active state,
   single hero metric per screen. **No second accent. No gradients. No
   glassmorphism. No neon.**
3. **Icons: `lucide-react-native` only.** `strokeWidth = icon.stroke` (2),
   `color = currentColor` (inherit from text). Sizes from `icon.sizes`. **No
   emoji, no logos used as icons** anywhere in UI chrome.
4. **Type: Inter only.** Hierarchy via size + weight + tracking. All
   stats/numbers use tabular figures (`type.score*` variants). Big numbers get
   negative tracking (already baked into `display*`/`score*` tokens).
5. **Spacing: only `space` tokens.** Multiples of 8; `4` and `12` allowed as
   half-steps. Internal padding ≤ external spacing (groups read as units).
6. **Radii: only `radius` tokens** (`sm` 8, `md` 12, `lg` 16, `xl` 24, `full`).
7. **Every screen has explicit empty, loading (skeleton), and error states.**
   No blank screens, no spinner-only, no dead whitespace. Fill with content +
   hierarchy, not padding.
8. **Touch targets ≥ 44pt. Body text ≥ 16pt. ≥4.5:1 contrast on every
   surface.**
9. **Selection layers: max two visible rows per screen** — one primary
   segmented control (the metric / what) + one secondary segmented control
   (scope / where). A "segmented control" re-scopes the **same** content
   (≤5 options). Tabs navigate to **different** content. Chips filter an open
   set. Don't stack four selectors.
10. **Polish:** press state scale `0.97` + surface lighten, in `motion.fast`
    (150ms); transitions `motion.base` (200ms) with `motion.easeInOut`;
    haptics on log-stat / PR / tab-select / pull-to-refresh; exactly **one**
    celebration moment per achievement (not per tap).

## What is NOT a fix

- Renaming `colors.paper` to `colors.surface.base` across the codebase. The
  names are the stable interface; values are the contract.
- Adding a "just one more accent" for category color. Use a neutral chip.
- Inlining a hex because a token doesn't exist yet. Add the token.
- Spinners as a loading state, or empty centered text as an empty state.
