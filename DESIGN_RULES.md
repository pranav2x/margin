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
| `colors.overlay`                  | `surface.overlay`             | `#1E242A`                  | Nested cards, active/highlighted rows (current user). |
| `colors.popover`                  | `surface.popover`             | `#272E35`                  | Modals, sheets, dropdowns.                            |
| `colors.ink`                      | `text.primary`                | `#FFFFFF`                  | Primary text, primary icons.                          |
| `colors.ash`                      | `text.secondary`              | `rgba(255,255,255,0.70)`   | Secondary text, subtitles.                            |
| `colors.shadow`                   | `text.tertiary`               | `rgba(255,255,255,0.50)`   | Tertiary text, muted icons, strong dividers.          |
| `colors.textDisabled`             | `text.disabled`               | `rgba(255,255,255,0.30)`   | Disabled text & controls.                             |
| `colors.fog`                      | `divider`                     | `rgba(255,255,255,0.08)`   | Hairlines, faintest fills.                            |
| `colors.scrim`                    | `scrim`                       | `rgba(0,0,0,0.35)`         | Media-overlay scrim (video chrome legibility).        |
| `colors.ember`                    | `accent.default`              | `#FC4C02`                  | THE single accent. Primary CTA / active / hero metric.|
| `colors.emberOnDark`              | `accent.onDark`               | `#FF6A2B`                  | Slightly brighter accent for small text on dark.      |
| `colors.emberPressed`             | `accent.pressed`              | `#CC4200`                  | Pressed/active state of the accent CTA.               |
| `colors.void`                     | (pure black)                  | `#000000`                  | System edges, `shadowColor` ONLY.                     |
| `colors.success`                  | `semantic.success`            | `#30D158`                  | Achievement / positive state. Use via `tone="success"`. |
| `colors.warning`                  | `semantic.warning`            | `#FFD60A`                  | Caution.                                              |
| `colors.error`                    | `semantic.error`              | `#FF453A`                  | Destructive / error. Use via `tone="error"`.          |
| `colors.info`                     | `semantic.info`               | `#0A84FF`                  | Informational.                                        |

### Radius scale

| Token        | px  | Use                                  |
| ------------ | --- | ------------------------------------ |
| `radius.xs`  | 4   | Checkboxes, tiny inline pills.        |
| `radius.sm`  | 8   | Chips, small buttons, inputs.         |
| `radius.md`  | 12  | Buttons, list rows, share cards.      |
| `radius.lg`  | 16  | Cards, capture cards.                 |
| `radius.xl`  | 24  | Sheets, hero cards.                   |
| `radius.full`| 9999 | Pills, avatars, FABs, circular hits. |

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
- Hand-rolling `color: colors.error` on a `<Txt>` to flag a failure. Use
  `tone="error"` / `tone="success"` — the primitive already maps both, so
  inline overrides are pure noise.
- Reaching for raw `borderRadius: <num>`. The audit floor is zero matches of
  `borderRadius: [0-9]` across `app/` and `components/`. Any new instance
  belongs on the `radius.*` scale; if a size truly doesn't fit, add a new
  token to `theme/radius.ts`.

## Empty / loading states

- Use `EmptyState` for screen-level dead-ends — `icon`, on-voice `title`,
  optional `body`, **required** `ctaLabel + onPress`. Never ship a blank
  list or centered "Nothing here".
- Use `Skeleton` for in-flight content; the skeleton must match the final
  layout (same height, same radius). Spinners are not a loading state.
- Avatars with no `uri` automatically render a monogram from `seed`. Pass
  the handle/name through every `<Avatar />` site so the fallback isn't a
  blank ring; bare `<Avatar />` is reserved for the unknown-author case.
- DEV-only fixture fallbacks (`__DEV__`-gated) are allowed so review
  builds against an unseeded Supabase project still render populated.
  Production code path must still surface the real `EmptyState`.
