# Elevate Visual Refactor — Phase 3 Consistency Pass

Phase 3 is the final sweep + the small set of known follow-ups flagged by the
Phase 2 lanes. Touch was minimum-surgical — tidy, do not redesign.

---

## 1. Sweep Results

| Sweep | Hits | Fixed | Allowed (documented exception) |
|---|---|---|---|
| Direct `lucide-react-native` imports outside `AppIcon.tsx` | 4 files | 4 fixed (all converted to `<AppIcon>`) | 1 (`AppIcon.tsx` itself) |
| `Trophy` placeholder for empty-state Check | 1 (`confirm/index.tsx`) | 1 fixed (swapped to `Check`) | 0 |
| Hex color literals (`#[0-9a-fA-F]{3,8}`) in `.ts`/`.tsx` outside `/theme/` | 0 | 0 | All 18 hits in `/theme/colors.ts` (source of truth) |
| `rgba(...)` / `SCRIM_BACKDROP` constants | 3 | 0 | All 3 are the documented `SCRIM_BACKDROP = 'rgba(0,0,0,0.35)'` in the clips screens |
| Direct `darkColors` imports in `.tsx` | 3 files | 0 | All 3 are clip screens (dark-by-default chrome, documented exception) |
| `InstrumentSerif` / `Geist*` / `fontFamily: 'Geist...'` references | 0 | 0 | 1 deprecation note in `Text.tsx` docstring (intentional historical comment) |
| Off-grid `padding/margin/gap` literals in `app/` and `components/` | 8 | 1 fixed (`32` → `space[8]` in `calls/[id].tsx`) | 7 remaining are micro-adjustments of `2` (allowed per Section 3c) or literal `0` (= `space[0]`) |
| User-visible `MARGIN` strings in `.tsx/.ts/.md/.json/.plist` (excluding `ios/MARGIN/`) | 16 | 0 | All 16 are inside `REFACTOR_PLAN.md` recon prose (intentional historical reference). `FEATURE_AUDIT.md`, `supabase/README.md`, and `README.md` titles already say "Elevate". |
| Inline `fontFamily:` on `Txt` outside allowed files | 1 (`StatLine.tsx` `VerifiedMark`) | 1 fixed (converted to `Txt variant="micro"`) | 15 remaining are TextInput style (necessary — TextInput can't render Txt) or `Score.tsx`/`RollUpNumber.tsx`/`ElevateRefresh.tsx` (motion/score allowed) or `Text.tsx`/`MicroLabel.tsx` (primitive allowed) |
| Inline `fontSize:` on `Txt` | 0 | 0 | 4 hits all in TextInput-style spreads (not Txt) |

---

## 2. Files Touched

| File | One-line reason |
|---|---|
| `components/primitives/AppIcon.tsx` | Added `Check` icon to the `Icons` map (Lane F flagged it as missing). |
| `app/confirm/index.tsx` | Restored `<AppIcon name="Check" />` for the "All caught up" empty state (was `Trophy` because `Check` wasn't registered). |
| `app/(auth)/eula.tsx` | Converted direct `lucide-react-native` `Check` imports to `<AppIcon name="Check" />` (2 sites: rules list + checkbox). |
| `app/onboarding/index.tsx` | Converted direct `Flame` import to `<AppIcon name="Flame" filled />` for the Day 1 celebration. |
| `components/composite/StreakBlock.tsx` | Converted `Flame` and `Snowflake` direct imports to `<AppIcon>`. |
| `components/composite/StreakMilestoneCard.tsx` | Converted `Flame` direct import to `<AppIcon name="Flame" filled />`. |
| `components/composite/StatLine.tsx` | Replaced raw `<Text>` + inline `fontFamily: fonts.bold` in `VerifiedMark` with `<Txt variant="micro">`. Removed the now-unused `Text` / `fonts` imports. |
| `app/calls/[id].tsx` | Replaced inline `paddingLeft: 32 + space[3]` (magic number) with `space[8] + space[3]` (the `sm` avatar width is `space[8] = 32`). |
| `app/calls/index.tsx` | Fixed tautological `backgroundColor: isWon ? colors.surface : colors.surface` in `StatusBadge` — collapsed to single expression. |

Untracked file `/.mcp.json` is unrelated to Phase 3.

---

## 3. Active-State Pattern Convergence

The Phase 2 lanes converged on **two patterns**, used in different roles. Future devs:
follow whichever role applies.

### Pattern A — Tab / filter rail (horizontal scroll headers)
`TabPill.tsx` is the canonical implementation. Used in `(tabs)/index.tsx`
(Boards filter rail), `onboarding/index.tsx` (multi-step header), etc.

- Active text: `weight="bold"` + `tone="ink"` (or `paper` if `inverted`)
- Inactive text: `weight="semibold"` + `tone="ash"`
- Active mark: a **2px ember underline** below the label (`borderRadius: 1`, `backgroundColor: colors.ember`)
- Inactive mark: transparent (no underline)

### Pattern B — Selection chip (multi-select sport, school, time-window)
`StatEntrySheet.tsx`, `ProfileEditSheet.tsx`, `onboarding/index.tsx` `SportChip`
are the canonical implementations.

- Active chip: `backgroundColor: colors.ember` (filled), `borderColor: 'transparent'`, label `color: colors.paper`
- Active pressed-in: `backgroundColor: colors.emberPressed`
- Inactive chip: `backgroundColor: colors.surface`, `borderColor: colors.fog`, label `color: colors.ink`
- Inactive pressed-in: `backgroundColor: colors.fog`
- Border radius is fully rounded (`999` for sheet chips, `20` for onboarding sport chips)

### Pattern C — Primary CTA (button)
`PrimaryButton.tsx` (`variant="primary"`):

- Resting: `backgroundColor: colors.ember`, label `color: colors.paper`
- Pressed: `backgroundColor: colors.emberPressed`
- Ghost variant inverts: `backgroundColor: colors.paper`, `borderWidth: 1`,
  `borderColor: colors.ink`, label `color: colors.ink`. Pressed-in: `colors.surface`.

### Pattern D — Tab bar icon (BottomTabBar)
`BottomTabBar.tsx`:

- Active: `tone="ember"`, `filled={true}`, label `color: colors.ember`, weight bold
- Inactive: `tone="ash"`, `filled={false}`, label `color: colors.ash`, weight semibold

---

## 4. Orange Budget Audit

Per-screen tally of distinct ember usages. "Sanctioned" = streak flame + one
hero stat per the user's Section 10 decision.

| Screen | Hero accent stat | Other ember usages | Verdict |
|---|---|---|---|
| Boards (`(tabs)/index.tsx`) | rank #1 row (Score + value go ember) | "TOP X%" trophy capsule (Score + AppIcon, both ember) | Under budget — at most one row + one capsule visible at a time |
| Battles (`(tabs)/battles.tsx`) | StatBlock tone="accent" on winning side only | Per-row ember on `meWins`/`oppWins` (only the winning side of each line), VS label, single ember PrimaryButton | Restrained — visual matches "winning side highlights" pattern |
| You (`(tabs)/you.tsx`) | Headline xl StatBlock (`tone="accent"`) **+** day-streak StatBlock (`tone="accent"`) | Streak flame (via `StreakBlock`) + 1 filled PrimaryButton (only "Add a stat") | Sanctioned per Section 10: streak flame + one hero stat is explicitly allowed. All other PrimaryButtons on the screen are ghost. |
| Player (`player/[id].tsx`) | Headline xl StatBlock (`tone="accent"`) | Follow CTA (only when not following) | Under budget |
| Clips feed (`(tabs)/clips.tsx`) | none | Active SocialActionRow only (1 icon at a time per clip) | Under budget |
| Calls feed (`calls/index.tsx`) | none | Status badge (ember "Called it") per call card + 1 filled PrimaryButton ("MAKE A CALL") | The status badges are list-item state markers (sanctioned analogue to streak flame). Under budget. |
| Confirm (`confirm/index.tsx`) | none | none | Clean — no ember beyond inherited tab bar active state |
| BottomTabBar (global) | n/a | Active tab icon + label only | Single ember tab at any time — by design |

**Net:** every screen lands at most at 1 hero stat + 1 button + 1 contextual
mark (status badge / streak flame). Within the ≤10% screen-coverage rule.

---

## 5. Light/Dark Issues Fixed

Single contrast-relevant issue:

- `app/calls/index.tsx` `StatusBadge` had `backgroundColor: isWon ? colors.surface : colors.surface` (tautology — both branches identical). Did not affect contrast (both branches resolved to `surface`), but signaled an unfinished decision from Lane B. Collapsed to `colors.surface`. The contrast still relies on the foreground color split (`isWon ? colors.ember : colors.ash`).

No `paper` vs `surface` swaps were necessary. Cards default to `surface` and
chrome defaults to `paper`. `ash` reads cleanly on both `paper` and `surface`
in both palettes:

- Light: `ash #6B6B6B` on `paper #FFFFFF` ≈ 5.1:1; on `surface #F7F7F7` ≈ 4.8:1
- Dark: `ash #A0A0A0` on `paper #121212` ≈ 7.0:1; on `surface #1E1E1E` ≈ 6.4:1

`shadow #8E8E93` is reserved for inverted hairlines (e.g., on dark `ShareCard`
clippings), never for body text. Confirmed by grep — only `HairlineRule`,
`Grain`, `Avatar` background, and `Text.tsx`'s `shadow` tone branch reach for
it.

---

## 6. Anything Not Cleanly Converted

1. **TextInput inline styles.** `app/calls/new.tsx`, `app/clips/new.tsx`,
   `app/takes/new.tsx`, `app/(tabs)/battles.tsx`, `app/onboarding/index.tsx`
   all have `<TextInput>` elements with inline `fontFamily: fonts.medium` (or
   `semibold`) and explicit `fontSize`. RN's `TextInput` cannot consume
   `<Txt>`, so these inlines are unavoidable. Two of them
   (`battles.tsx`, `onboarding/index.tsx`) already spread `type.bodyLg` and
   then override `fontFamily` for prominence — that's the cleanest the pattern
   gets without inventing a new styled-TextInput primitive (which was out of
   scope for Phase 3).

2. **`components/motion/ElevateRefresh.tsx`** uses inline
   `fontFamily: fonts.bold` and `fontFamily: fonts.extrabold` on
   `Animated.Text` because the pull-to-refresh wordmark cross-fades between
   two weights based on `pull.value`. This requires `Animated.Text` with
   shared style refs, so wrapping in `<Txt>` would lose the animation. Left
   as-is — it is a motion primitive sibling to `Score.tsx`.

3. **`onboarding/index.tsx` sport chip pressed state.** The onboarding sport
   chip does not use `emberPressed` on press-in (Pattern B's "pressed
   variant"). Unlike the action-sheet chips, it uses static ember while
   active. This is a minor inconsistency, but the onboarding chip is in a
   one-shot setup flow where press latency is brief. Did not change it.

4. **Doc-prose mentions of `MARGIN`** in `REFACTOR_PLAN.md` remain (16 hits).
   These are recon documentation describing the rename itself — flipping them
   would erase the audit trail. Intentional.

---

## 7. Definition-of-Done Check

Against the user's stated success criteria (paraphrased from the Phase 3
prompt + `REFACTOR_PLAN.md` §10):

| Criterion | Status |
|---|---|
| Builds with no functional regressions | **Yes.** `npx tsc --noEmit` exits 0. `npx expo export --platform ios` bundles cleanly in 3.6s, 3869 modules, 7.88MB hbc, no warnings. |
| Every screen uses Inter + tokens | **Yes.** No remaining `Geist*` / `InstrumentSerif` references in source (only a Text.tsx deprecation note). All colors via `useTheme().colors` or `darkColors` (3 documented dark-by-default clip screens). |
| Stat/confidence/streak use big-number pattern | **Yes.** `StatBlock` primitive ships big number + UPPERCASE label across Boards (rank), You (headline + streak + verified + tracked), Player, Calls (confidence), and StreakBlock (count). |
| 5-tab bar with orange create button | **Yes.** `BottomTabBar.tsx` renders Boards / Battles / [+] / Clips / You, with the [+] as a filled ember circle that opens a bottom-sheet action menu. |
| "Elevate" used everywhere; no leftover "MARGIN" UI text | **Yes.** All user-facing copy (auth screens, splash, sheets, share cards, capture targets) reads "Elevate". The only `MARGIN` strings left are: (a) `REFACTOR_PLAN.md` recon prose, (b) the `ios/MARGIN/` native folder (deferred per Section 10). |
| Light + dark both clean | **Yes.** Single tautological branch fixed in `calls/index.tsx`. All other consumers go through the theme. WCAG contrast ratios pass for `ash`/`shadow` against `paper`/`surface` in both palettes. |
| Orange restrained | **Yes.** Per-screen audit in §4 above. Every screen has at most one xl accent stat (You is the sanctioned exception with streak + headline) + one filled PrimaryButton + contextual marks. |

---

## 8. Open Follow-Ups for the User

These were flagged out-of-scope for Phase 3 and remain open:

1. **Deferred iOS bundle ID / scheme rename** (REFACTOR_PLAN.md §7, §10):
   - `ios/MARGIN/` native folder name (and `.xcodeproj`, `Info.plist`,
     `pbxproj` `PRODUCT_NAME = MARGIN`, `PRODUCT_BUNDLE_IDENTIFIER = com.margin.app`,
     `MARGIN-Bridging-Header.h`, `MARGIN.entitlements`)
   - `scheme` `margin` in `app.json` (requires Supabase Auth redirect URL
     update + Google iOS OAuth console update)
   - `bundleIdentifier` `com.margin.app` (requires new App Store entry, new
     push certs, new Google iOS OAuth client — rotate-and-cut-over, high risk)
   - `package` `com.margin.app` (Android)
   - `package.json` `name` field `margin`
   - Top-level folder `margin/`
   - The visible-app-name fix (`CFBundleDisplayName: Elevate`) was already
     applied in Phase 1.

2. **Net-new screens need Supabase wiring** (REFACTOR_PLAN.md §10 explicitly
   says wiring is the user's follow-up). The Lane B and Lane D scaffolding
   has TODO markers where Supabase hooks belong:
   - **Calls** (`app/calls/index.tsx`, `app/calls/new.tsx`,
     `app/calls/[id].tsx`) — list, composer with `ConfidenceMeter`, and
     detail screens render against mock data
   - **Takes** (`app/takes/new.tsx`) — composer renders against mock data
   - **Clips** (`app/(tabs)/clips.tsx`, `app/clips/[id].tsx`,
     `app/clips/new.tsx`) — vertical feed and player chrome render against
     mock data
   - All of these need `useCallFeed`, `useTake`, `useClipFeed`,
     `createCall`, `postTake`, `uploadClip`, etc. hooks wired to Supabase.

3. **`ElevateRefresh.tsx` is still unused.** The pull-to-refresh wordmark
   primitive exists (renamed from `MarginRefresh` in Phase 1) but no
   `RefreshControl` consumer was wired in `you.tsx` or `(tabs)/index.tsx`.
   Either wire it in or delete the file in a future cleanup.

4. **Dead-code cleanup** (REFACTOR_PLAN.md §10 explicitly says leave alone,
   but listed here so it doesn't get forgotten): `/state/user.ts` (unused
   zustand mock) and `/types/index.ts` (unused NBA athlete types) can be
   deleted whenever convenient.

5. **`onboarding/index.tsx` sport chip pressed state.** Listed in §6 above
   — minor visual polish, low priority.

6. **TextInput primitive.** If you want to fully eliminate inline
   `fontFamily:` from non-allowed files (see §1, §6), a thin
   `<StyledTextInput variant="bodyLg" weight="semibold" />` primitive would
   absorb the remaining 7 TextInput inline overrides. Out of scope for the
   refactor; ticket for a future cleanup pass.

---

*Phase 3 — Consistency pass complete. No commit made; user reviews and
commits the whole phase as one unit.*
