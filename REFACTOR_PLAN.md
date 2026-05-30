# Elevate (formerly MARGIN) — Phase 0 Recon Plan

Recon-only. No app code edited. Use this doc to dispatch Phase 1 (primitives) and Phase 2 (6 parallel lanes).

---

## 0. Critical Findings (read first)

1. **`strava-design-teardown.md` does NOT exist** on disk.
   - Searched `/Users/pranav2x/Documents/Projects/margin/**` and `/Users/pranav2x/**` to depth 4 — zero matches.
   - **Fallback design tokens (from the user's prompt — treat as source of truth until the teardown lands):**
     - Type: Inter (400 / 500 / 600 / 700 / 800). Optional condensed display face (Bebas Neue / Anton) — TBD.
     - Color: orange `#FC5200` (CTA / active tab / streak flame), pressed `#CC4200`, near-black `#1A1A1A`, gray labels `#6B6B6B`–`#8E8E93`, dividers `#E5E5E5` / `#F2F2F2`, dark bg `#121212`.
     - Layout: 8pt spacing grid, ~16px side margins, mobile-first 375–430px.
     - Signature stat block: big bold number + small UPPERCASE letter-spaced gray label.
     - 5-tab bar with a prominent orange circular center "create" button.
     - Single ~2px line-icon set, filled-on-active.
   - **Concepts the user listed** (`takes`, `calls` w/ 1–10 confidence, `byline`, `edition streak`, `clips`) **do not match what is in the current app.** The current Elevate is a verified-stat / leaderboards / battles product (see Section 2). Concept mapping is in Section 9.

2. **App is mid-rename: brand name "Elevate" is in `app.json`, but everywhere else still says MARGIN / margin / com.margin.app.** See Section 7 — these are not all safe to flip blindly.

3. **`/state/user.ts` is dead code** (in-memory zustand mock with NBA/WNBA athletes, `editionStreak`, freezes). Not referenced anywhere in `/app` or `/components`. `/types/index.ts` is also dead (NBA `Athlete`, `RecentGame`). Safe to delete in a later cleanup pass, but flag before Phase 2.

4. **No `athlete/` route group, no `clips`, no `calls`, no `takes`, no `player_layout`.** Routes are auth / tabs (boards, battles, you) / onboarding / confirm / player / splash. Section 2 lists everything.

5. **Theme is well-structured and single-source-of-truth.** Almost zero hardcoded hex in `.tsx` (0 occurrences outside `/theme/` and dead `state/user.ts`). Most "violations" are inline `fontSize` / `fontFamily: 'InstrumentSerifItalic'` overrides on the existing `Txt` primitive, which uses theme tokens for the base style. Section 5 has the count.

---

## 1. Current Styling Approach (for a fresh agent)

- **Source of truth:** `/theme/index.ts` exports `colors`, `type`, `space`, `motion`, `fonts`, and a `useTheme()` hook that reads light/dark from `usePreferencesStore` + system scheme.
- **Color model:** 8-token palette (`ink`, `paper`, `surface`, `fog`, `ash`, `shadow`, `ember`, `void`) defined in two flavors (`lightColors`, `darkColors`). `ember` is `#D9430F` (light) / `#FF5A2C` (dark) — close to but not the Strava `#FC5200`.
- **Typography model:** Two display faces (Instrument Serif + italic), three Geist weights, two Geist Mono weights. Score numerals use Geist Mono tabular. All loaded via `expo-font` + `@expo-google-fonts/*` packages — no `.ttf` files in `/assets`.
- **Spacing model:** 4px base (`space[1] = 4`), 12-step scale up to `space[11] = 120`. `SCREEN_PADDING = space[5] = 20`. Used consistently across screens.
- **Primitives:** `Txt`, `MicroLabel`, `HairlineRule`, `Avatar`, `PrimaryButton`, `Grain`, `GrayImage`, `PressableScale`. All theme-aware.
- **Composites:** `StatLine` + `VerifiedMark`, `TabPill`, `ShareCard`, `BattleShareCard`, `StreakBlock`, `StreakMilestoneCard`, `BottomTabBar`, `ProfileEditSheet`, `StatEntrySheet`.
- **Motion:** `Score` (static numeric), `RollUpNumber` (animated digit roll), `MarginRefresh` (pull-to-refresh wordmark — currently shows "Elevate"; misnamed file).
- **Patterns:** Heavy use of inline `style={{ ... }}` arrays referencing `space[n]` / `colors.x` / `fonts.x`. No StyleSheet.create, no NativeWind, no styled-components. Refactor lanes will be touching these inline blocks.

---

## 2. Screen / Route Inventory (Expo Router)

All routes live under `/Users/pranav2x/Documents/Projects/margin/app/`.

| Path | Concept | Heavy styling? |
|---|---|---|
| `app/_layout.tsx` | Root layout: fonts, providers, auth gate, Stack registration | Medium — font loader + stack screen options |
| `app/splash.tsx` | "ELEVATE" letter-by-letter animation, 2.4s then `/(tabs)` | Heavy — Reanimated wordmark |
| `app/(auth)/_layout.tsx` | Auth group Stack wrapper | Trivial |
| `app/(auth)/sign-in.tsx` | Google + Apple sign-in landing | Medium — display1 wordmark + buttons |
| `app/(auth)/age-gate.tsx` | YYYY birth-year prompt; under-13 block screen | Medium — large mono input + display headline |
| `app/(auth)/eula.tsx` | Community-rules acceptance checkbox | Medium — display headline + custom checkbox |
| `app/(auth)/rules.tsx` | Full community rules read-only page | Light |
| `app/(tabs)/_layout.tsx` | Tabs navigator wiring `BottomTabBar` | Trivial — delegates to BottomTabBar |
| `app/(tabs)/index.tsx` | **Boards (leaderboards)** — sport / scope / metric filters + ranked list | Heavy — sticky filter header, percentile pill, FlashList rows |
| `app/(tabs)/battles.tsx` | **Battles (head-to-head)** — opponent search, school + nearby lists, comparison view, share | Very heavy — two-mode screen, tally band, comparison rows, share card |
| `app/(tabs)/you.tsx` | **You (profile + stats + streak)** — masthead, streak block / milestone, headline stat, stat lines, share card, sheets | Very heavy — biggest screen in the app |
| `app/confirm/index.tsx` | Peer-cosign feed (teammates' unconfirmed marks) | Medium |
| `app/confirm/[statId].tsx` | Single-mark cosign deep-link screen | Medium |
| `app/onboarding/index.tsx` | Two-step (handle/gradyear/sport, then school) + "streak day 1" commitment beat | Heavy — biggest non-tab screen |
| `app/player/[id].tsx` | Public profile (followers/following, follow/report/block, stat lines) | Heavy — full masthead + grouped stat lines |

**Domain note:** core concepts in this app are *stat*, *metric*, *peer cosign / verification*, *battle (head-to-head)*, *streak (edition streak ≈ daily-return streak)*, *board (leaderboard)*. The user's prompt-level concepts (`takes`, `calls`, `byline`, `clips`) are aspirational / future work. See Section 9.

---

## 3. Navigator / Layout Inventory

| File | What it sets |
|---|---|
| `/app/_layout.tsx` | Fonts (Instrument Serif, Geist x3, Geist Mono x2). `QueryClientProvider`, `SafeAreaProvider`, `GestureHandlerRootView`. Auth gate with sign-in → age-gate → EULA → onboarding → tabs. Root `<Stack>` with screens for `(auth)`, `(tabs)`, `player/[id]`, `confirm/[statId]`, `confirm/index`, `onboarding/index`, `splash`. All `headerShown: false`; modals via `presentation: 'card'` + `slide_from_bottom`. |
| `/app/(auth)/_layout.tsx` | Plain `<Stack>` with `headerShown: false` and `paper` background. |
| `/app/(tabs)/_layout.tsx` | `<Tabs>` with `tabBar={(props) => <BottomTabBar {...props} />}`. Registers three tabs: `index` (boards), `battles`, `you`. Order matters when adding a 5-tab Strava bar. |

**Tab-bar rebuild target:** `/Users/pranav2x/Documents/Projects/margin/components/composite/BottomTabBar.tsx` is the file every Phase-2 lane must NOT touch — it is the prime Phase-1 primitive to rewrite (orange center create button + 5 line icons + filled-on-active state). The Tabs registration in `(tabs)/_layout.tsx` will also need 2 new screens added (a center "create" route and a fifth tab — TBD with the user; see Section 9).

---

## 4. Shared Component Inventory

All paths under `/Users/pranav2x/Documents/Projects/margin/components/`.

### Primitives (`primitives/`)

| File | Purpose | Class |
|---|---|---|
| `Text.tsx` (`Txt`) | Theme-aware Text wrapping `type[variant]` + tone + italic toggle | primitive |
| `MicroLabel.tsx` | Uppercase tracked-out 10pt label (`type.micro`) | primitive |
| `HairlineRule.tsx` | 1px-or-hairline `fog`/`shadow` divider | primitive |
| `PrimaryButton.tsx` | Ember-fill (primary) / ink-outline (ghost) button + haptics + `ButtonRow` + `GhostButton` re-exports | primitive |
| `Avatar.tsx` | Circular `expo-image` w/ Unsplash desaturation + 4% ink overlay | primitive |
| `Grain.tsx` | SVG mulberry-grain newsprint texture | primitive (decorative) |
| `GrayImage.tsx` | Desaturated/tinted `expo-image` for editorial photos | primitive |
| `PressableScale.tsx` | Reanimated press-in scale + opacity + haptic | primitive |

### Composites (`composite/`)

| File | Purpose | Class |
|---|---|---|
| `StatLine.tsx` (+ `VerifiedMark` named export) | One-row metric label/value + verified badge + plausibility | composite |
| `TabPill.tsx` | Horizontal scroll of italic-on-active text "pills" (no actual pill chip) | composite |
| `ShareCard.tsx` | Capture-target press-clipping for /you (headline stats) | composite (capture target) |
| `BattleShareCard.tsx` | Capture-target press-clipping for /battles | composite (capture target) |
| `StreakBlock.tsx` | Ember flame + current count + 7-day strip | composite |
| `StreakMilestoneCard.tsx` | Capture-target shareable milestone card | composite (capture target) |
| `BottomTabBar.tsx` | Custom tab bar (BlurView + crossfade icon + dual-state wordmark label) | composite (chrome) |
| `ProfileEditSheet.tsx` | BottomSheetModal: avatar URL, name, sport chips, school picker | composite (sheet) |
| `StatEntrySheet.tsx` | BottomSheetModal: pick sport+metric, enter value, request verification | composite (sheet) |

### Motion (`motion/`)

| File | Purpose | Class |
|---|---|---|
| `Score.tsx` | Static Geist-Mono tabular numeral at xl/lg/md/sm | primitive (display) |
| `RollUpNumber.tsx` | Per-digit roll-up animation of `Score` | primitive (display) |
| `MarginRefresh.tsx` | Pull-to-refresh wordmark animation. **File is misnamed (says "Margin", renders "Elevate")**. Currently unused — no `RefreshControl` consumer. Candidate to delete or rename. | primitive (decorative) |

### Phase-1 primitive candidates (the user named these)

| Requested primitive | Maps to existing | Action |
|---|---|---|
| `StatBlock` | `Score` + `MicroLabel` pattern repeated inline everywhere | NEW primitive — extract |
| `ConfidenceMeter` | Not present (no `calls` feature yet) | NEW primitive — net-new |
| `AppIcon` | Inlined `lucide-react-native` imports (`Trophy`, `Swords`, `User`, `Flame`, `Snowflake`, `X`) | NEW primitive — thin wrapper for 2px strokeWidth + filled-on-active variant |
| `PrimaryButton` | `PrimaryButton.tsx` exists; ember fill is wrong shade (`#D9430F` vs target `#FC5200`) | EXTEND — re-tune colors + add pressed state |
| `Card` | Not present (raw inline `View` with `surface` bg + ink border in ShareCard etc.) | NEW primitive — extract |
| `TabBar` | `BottomTabBar.tsx` | REPLACE — 5 tabs + orange center create button |
| `Avatar+meta` | `Avatar.tsx` (avatar only) + repeated `@handle` / meta-line pattern in `you.tsx`, `player/[id].tsx`, `battles.tsx` | NEW composite — extract |
| `SocialActionRow` | Not present (no like/comment/share row anywhere — only share-card buttons) | NEW primitive — net-new |

---

## 5. Current Theme Audit

### `/Users/pranav2x/Documents/Projects/margin/theme/index.ts`
```ts
export function useTheme(): { colors: ColorPalette; isDark: boolean } {
  const scheme = useColorScheme();
  const pref = usePreferencesStore((s) => s.themePreference);
  const isDark = pref === 'dark' ? true : pref === 'light' ? false : scheme === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}
```
Re-exports `./colors`, `./type`, `./space`, `./motion`. Clean.

### `/Users/pranav2x/Documents/Projects/margin/theme/colors.ts`
8 tokens, two palettes (light + dark):
- light: `ink #0A0A0A`, `paper #F8F6F1` (cream — not Strava neutral), `surface #F1EDE4`, `fog #E8E5DE`, `ash #8C8A85`, `shadow #2A2826`, `ember #D9430F` (Strava-ish but warmer), `void #000`.
- dark: `ink #EDEAE3`, `paper #0F0E0C`, `surface #1A1815`, `fog #26241F`, `ash #6F6D68`, `shadow #D6D2C9`, `ember #FF5A2C`, `void #000`.

### `/Users/pranav2x/Documents/Projects/margin/theme/type.ts`
- Fonts: `serif: 'InstrumentSerif'`, `serifItalic`, `body: 'Geist'`, `bodyMedium`, `bodySemibold`, `mono: 'GeistMono'`, `monoMedium`.
- Variants: `display1` (72/76, -1.5LS) through `display4` (28/32), `bodyLg/body/bodySm` (17/15/13), `label` (12 / +0.4LS), `micro` (10 / +1.2LS uppercase), `scoreXl/Lg/Md/Sm` (64/40/24/14 Geist Mono tabular).

### `/Users/pranav2x/Documents/Projects/margin/theme/space.ts`
4-px base: `0,4,8,12,16,20,24,32,40,56,80,120`. `SCREEN_PADDING = space[5] = 20`.

### `/Users/pranav2x/Documents/Projects/margin/theme/motion.ts`
Easing curves `easeOut`/`easeInOut`, spring tokens, durations `fast/base/slow/glacial` (180/280/480/800).

### Assessment
- Theme **is** the single source of truth. We can replace it cleanly: swap palette tokens (ink→#1A1A1A, paper→#FFF / dark→#121212, ember→#FC5200), swap fonts (`Geist*` → `Inter*`, decide on optional condensed display), keep the spacing scale (it already maps to 4/8/16/24/32 — compatible with the 8pt grid).
- No StyleSheet, NativeWind, or styled-components anywhere — refactor is pure token swap + inline-style replacement.

### Worst offenders (files that bypass the system most)
- **Inline `fontFamily: 'InstrumentSerifItalic'` overrides (33 occurrences across 13 files).** Pattern: `<Txt italic ... style={{ fontFamily: 'InstrumentSerifItalic', ...}} />`. These exist because `Txt` only swaps italic when the *base* family is `fonts.serif`; callers using `bodyLg/bodySm` reach in directly. **Files:** `app/(tabs)/index.tsx` (3), `app/(tabs)/you.tsx` (2), `app/(tabs)/battles.tsx` (5), `app/confirm/index.tsx` (2), `app/confirm/[statId].tsx` (3), `app/(auth)/age-gate.tsx` (2), `app/(auth)/eula.tsx` (3), `app/(auth)/sign-in.tsx` (1), `app/(auth)/rules.tsx` (2), `app/onboarding/index.tsx` (5), `app/player/[id].tsx` (3), `components/composite/ShareCard.tsx` (1), `components/composite/StatLine.tsx` (1), `components/composite/ProfileEditSheet.tsx` (1), `components/composite/StatEntrySheet.tsx` (3), `components/composite/TabPill.tsx` (1).
- **Inline `fontFamily: 'GeistMono'` for handle display** in `you.tsx`, `battles.tsx`, `player/[id].tsx` (3 files, 3 occurrences). Should be a primitive (`HandleText`?).
- **Inline `fontSize:` overrides on `Txt`** — 56 occurrences across the app. Pattern: `<Txt variant="display1" style={{ fontSize: 56 }}>` (re-tuning display sizes per screen because the variant defaults to 72/76). Phase 1 should redefine the display scale so re-tuning isn't needed.
- **Inline magic-number padding/margin** (NOT going through `space[n]`): only 5 occurrences total — `marginTop: 2` (4 spots in `(tabs)/index.tsx`, `battles.tsx`, `confirm/index.tsx`) and `paddingVertical: 2` in `StatLine.tsx`'s `VerifiedMark`. Genuinely minor.
- **Hardcoded hex in `.tsx`/`.ts` outside `/theme/`:** **0** in `/app` and `/components`. Clean.

---

## 6. Font / Icon Stack

### Fonts loaded today (`app/_layout.tsx` lines 42–50)
- `InstrumentSerif` (`@expo-google-fonts/instrument-serif` 400)
- `InstrumentSerifItalic` (same package, 400 italic)
- `Geist` (`@expo-google-fonts/geist` 400)
- `GeistMedium` (500)
- `GeistSemibold` (600)
- `GeistMono` (`@expo-google-fonts/geist-mono` 400)
- `GeistMonoMedium` (500)

**Inter is NOT present.** Geist is the current sans (a Vercel face, geometric, lighter than Inter). To match Strava's utilitarian feel we'll need to add `@expo-google-fonts/inter` (or load Inter Variable from `expo-font`). No `.ttf` files in `/assets/fonts/` — there is no `/assets/fonts/` directory at all.

No `Bebas Neue` / `Anton` references anywhere. Decision deferred to user (Section 9).

### Icon library
- `lucide-react-native ^0.544.0` is installed and already in use across 8 files: `BottomTabBar` (`Trophy`, `Swords`, `User`), `StreakBlock` (`Flame`, `Snowflake`), `StreakMilestoneCard` (`Flame`), `onboarding` (`Flame`), and three `X` close icons in `confirm/*`, `rules.tsx`, `player/[id].tsx`.
- All icons render at `strokeWidth={1.25}` to `1.75` — not the 2px Strava spec. We can keep the library (Lucide is the de-facto line-icon set) and standardize on `strokeWidth={2}` plus a filled-on-active variant (Lucide ships filled siblings for many icons).
- **No need to install a new icon set.** A thin `AppIcon` primitive wrapping Lucide's `LucideIcon` type is sufficient.

---

## 7. Rename Findings (MARGIN → Elevate)

Brand rename is mid-flight. `app.json` `expo.name` already says `"Elevate"`. Everything else below is still `MARGIN` / `margin` / `com.margin.app`.

### Safe UI string changes (no infra impact — flip whenever)

| Path | Line | Current | Notes |
|---|---|---|---|
| `/Users/pranav2x/Documents/Projects/margin/FEATURE_AUDIT.md` | 1 | `# MARGIN — Read-Only Feature Audit` | Doc title only |
| `/Users/pranav2x/Documents/Projects/margin/supabase/README.md` | 1 | `# MARGIN — Supabase schema` | Doc title only |
| `/Users/pranav2x/Documents/Projects/margin/README.md` | 92 | `motion/  RollUpNumber, Score, MarginRefresh (...)` | Doc reference to `MarginRefresh` component name |
| `/Users/pranav2x/Documents/Projects/margin/components/motion/MarginRefresh.tsx` | filename + function name + render text | Renders `"Elevate"` already; **file + export are still called `MarginRefresh`** | Component is currently UNUSED — no `RefreshControl` consumer. Safe to rename → `ElevateRefresh` or delete entirely. |

### Brand strings already saying "Elevate" (no action needed)
- `app.json` `expo.name`
- All in-app copy in `(auth)/sign-in.tsx`, `(auth)/age-gate.tsx`, `(auth)/eula.tsx`, `(auth)/rules.tsx`, `splash.tsx` (`LETTERS = ['E','L','E','V','A','T','E']`)
- All capture cards (`ShareCard`, `BattleShareCard`, `StreakMilestoneCard`)
- `StatEntrySheet.tsx` share message
- `player/[id].tsx` block dialog
- `theme/colors.ts` header comment

### Identifiers — DO NOT FLIP WITHOUT HUMAN DECISION

These are wired into signing, OAuth redirects, deep linking, Supabase config, and Google's published iOS URL scheme. Changing any of them silently will break sign-in and push.

| Path | Line(s) | Value | Risk |
|---|---|---|---|
| `/Users/pranav2x/Documents/Projects/margin/app.json` | 9 | `"scheme": "margin"` — already has TODO comment: `coordinate scheme rename with Supabase + Google OAuth` | Deep-link scheme. Used by OAuth callback (`margin://` + `exp+margin://`). Renaming requires Supabase Auth redirect URL update + Google console URI update. |
| `/Users/pranav2x/Documents/Projects/margin/app.json` | 19 | `"bundleIdentifier": "com.margin.app"` | iOS bundle ID. Push certs, App Store entry, Google iOS OAuth client all keyed to this. |
| `/Users/pranav2x/Documents/Projects/margin/app.json` | 32 | `"package": "com.margin.app"` | Android package. Play Store entry + signing. |
| `/Users/pranav2x/Documents/Projects/margin/app.json` | 2 | `"slug": "elevate"` | Already updated to `elevate`. Verify it matches the EAS project. |
| `/Users/pranav2x/Documents/Projects/margin/package.json` | 2 | `"name": "margin"` | npm package name. Local-only; safe but coordinate with `package-lock.json`. |
| `/Users/pranav2x/Documents/Projects/margin/package-lock.json` | 2, 8 | `"name": "margin"` | Regenerated on `npm install` after renaming `package.json`. |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN/` | dir | iOS native project directory | Renaming requires `expo prebuild --clean` or hand-editing many path references. |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN.xcodeproj/project.pbxproj` | 387, 388, 421, 422 | `PRODUCT_NAME = MARGIN; PRODUCT_BUNDLE_IDENTIFIER = com.margin.app;` (debug + release) | Xcode target. Affects compiled binary name. |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN/Info.plist` | 12 | `<key>CFBundleDisplayName</key><string>MARGIN</string>` | The name iOS shows on the home screen. **This is the visible app name. Should be `Elevate` for any new build.** |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN/Info.plist` | 32–33 | `CFBundleURLSchemes`: `margin`, `com.margin.app` | Mirror of `app.json` scheme + bundle ID. |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN/Info.plist` | 39 | `exp+margin` | Expo dev client deep-link scheme. |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN/Info.plist` | 45 | `com.googleusercontent.apps.407572513608-9km3b763ht7oh44lfhau11t07gc9ivvl` | **Google iOS OAuth reversed-client-id.** Issued by Google for the iOS client; cannot be renamed locally without rotating the OAuth credentials. |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN/MARGIN-Bridging-Header.h` | filename | Swift bridging header named `MARGIN-…` | Rename requires updating `SWIFT_OBJC_BRIDGING_HEADER` build setting. |
| `/Users/pranav2x/Documents/Projects/margin/ios/MARGIN/MARGIN.entitlements` | filename | Entitlements file named `MARGIN.entitlements` | Rename requires updating `CODE_SIGN_ENTITLEMENTS` build setting (pbxproj lines 364, 403). |
| Folder name `/Users/pranav2x/Documents/Projects/margin` | — | Top-level project folder still `margin/` | Local-only; no app impact, but the user may want to keep it (matches existing IDE/AI memory paths) or rename to `elevate/`. |

**Recommendation:** treat the rename as a separate Phase 0.5 ticket. Do NOT bundle identifier flips into Phase 2 UI work.

---

## 8. Parallel Agent Split for Phase 2

**Rule:** no two lanes may edit the same file. Anything shared moves to Phase 1.

### Phase 1 (must land before Phase 2 lanes start)

Files in `/components/primitives/` and `/theme/`. Phase 1 owns:
- `/theme/colors.ts`, `/theme/type.ts`, `/theme/space.ts`, `/theme/motion.ts`, `/theme/index.ts`
- New: `/components/primitives/AppIcon.tsx`
- New: `/components/primitives/StatBlock.tsx` (big number + UPPERCASE label)
- New: `/components/primitives/Card.tsx`
- New: `/components/primitives/ConfidenceMeter.tsx` (deferred if no `calls` feature)
- New: `/components/primitives/SocialActionRow.tsx` (deferred if no feed)
- New: `/components/composite/AvatarMeta.tsx` (avatar + handle + meta)
- Updated: `/components/primitives/PrimaryButton.tsx` (re-tune to `#FC5200` + pressed `#CC4200`)
- Updated: `/components/primitives/Text.tsx`, `MicroLabel.tsx`, `HairlineRule.tsx` (token swap only)
- Updated: `/components/composite/BottomTabBar.tsx` (rebuilt: 5 tabs + orange center create button)
- Updated: `/components/motion/Score.tsx`, `RollUpNumber.tsx` (font swap to Inter Tabular or kept on Geist Mono — see Q in Section 9)
- Updated: `/app/_layout.tsx` (`useFonts` swap)
- Updated: `/app/(tabs)/_layout.tsx` (tab registration: add `create` and a 5th tab)

### Phase 2 lanes (after Phase 1)

#### Lane A — Home / feed + "take" cards
**Maps to:** the **Boards** tab (current `index.tsx`). There is no take feed; this lane restyles the leaderboards screen — the closest thing to "home / feed."
- Owns: `/Users/pranav2x/Documents/Projects/margin/app/(tabs)/index.tsx`
- Off-limits: `(tabs)/_layout.tsx`, any Phase-1 primitive
- Deps from Phase 1: `StatBlock`, `AppIcon`, `Card`, `PrimaryButton`, `AvatarMeta`

#### Lane B — Calls + confidence
**Maps to:** **net-new screens.** No `calls` route exists today. Either (a) Lane B is paused until the calls feature is scoped, or (b) Lane B builds new routes (`/app/calls/`).
- Owns (if greenlit): `/Users/pranav2x/Documents/Projects/margin/app/calls/` (TBD)
- Off-limits: every existing screen
- Deps from Phase 1: `ConfidenceMeter`, `StatBlock`, `Card`, `PrimaryButton`, `AvatarMeta`

#### Lane C — Byline + streak
**Maps to:** the **You** tab + the player profile + streak surfaces (in current vocab: "byline" = profile masthead).
- Owns:
  - `/Users/pranav2x/Documents/Projects/margin/app/(tabs)/you.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/player/[id].tsx`
- Off-limits: `BottomTabBar`, `ProfileEditSheet`, `StatEntrySheet` (these belong to Lane E and Phase 1 respectively), all share cards (also Phase 1 capture targets)
- Deps from Phase 1: `StatBlock`, `Card`, `AvatarMeta`, `AppIcon` (Flame, Snowflake), updated `StreakBlock` + `StreakMilestoneCard` (Phase 1 reskin)
- **Conflict to resolve:** `StreakBlock.tsx` + `StreakMilestoneCard.tsx` currently live in `/components/composite/` and are imported by `you.tsx` + `onboarding/index.tsx`. They must be reskinned in Phase 1 (shared by Lane C + Lane F — onboarding). Either keep them as Phase-1 components, or move them to `/components/primitives/streak/`.

#### Lane D — Clips
**Maps to:** **net-new screens.** No `clips` route or video player feature exists today. (There's `expo-video` installed but unused beyond the dependency.)
- Owns (if greenlit): `/Users/pranav2x/Documents/Projects/margin/app/clips/` (TBD)
- Off-limits: every existing screen
- Deps from Phase 1: `Card`, `AppIcon`, `SocialActionRow`, `AvatarMeta`

#### Lane E — Create flow
**Maps to:** the two BottomSheetModals (`StatEntrySheet`, `ProfileEditSheet`) + the new center-tab "create" entry point that opens them.
- Owns:
  - `/Users/pranav2x/Documents/Projects/margin/components/composite/StatEntrySheet.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/components/composite/ProfileEditSheet.tsx`
  - (If a center-tab dedicated screen is added) `/Users/pranav2x/Documents/Projects/margin/app/(tabs)/create.tsx`
- Off-limits: `BottomTabBar.tsx` (Phase 1), `you.tsx` (Lane C — but Lane C calls `sheetRef.current?.present()` so the public sheet ref API must stay stable)
- Deps from Phase 1: `PrimaryButton`, `Card`, `AppIcon`, `StatBlock`

#### Lane F — Tab bar / headers / settings / shared chrome / onboarding / auth / confirm
**Maps to:** everything that's "shared chrome" or login/age/consent/onboarding/confirm.
- Owns:
  - `/Users/pranav2x/Documents/Projects/margin/app/_layout.tsx` (header/Stack options only — font loader belongs to Phase 1)
  - `/Users/pranav2x/Documents/Projects/margin/app/splash.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/(auth)/_layout.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/(auth)/sign-in.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/(auth)/age-gate.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/(auth)/eula.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/(auth)/rules.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/onboarding/index.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/confirm/index.tsx`
  - `/Users/pranav2x/Documents/Projects/margin/app/confirm/[statId].tsx`
- Off-limits: `(tabs)/_layout.tsx` (Phase 1 — adds new tabs), `BottomTabBar.tsx` (Phase 1)
- Deps from Phase 1: `PrimaryButton`, `StatBlock`, `Card`, `AppIcon`, `AvatarMeta`

#### Lane G (suggested) — Battles
The user's 6-lane split lumped battles into "home/feed" (A). That's a stretch — `battles.tsx` is 507 lines and tonally distinct (head-to-head comparison + share). Either expand A to own battles, or split as Lane G:
- Owns: `/Users/pranav2x/Documents/Projects/margin/app/(tabs)/battles.tsx`
- Off-limits: `BattleShareCard.tsx` (Phase 1 — capture target shared with any future re-renders)
- Deps from Phase 1: `StatBlock`, `Card`, `AvatarMeta`, `AppIcon`, `PrimaryButton`

### Conflict callouts found
- `BottomTabBar.tsx` is the most-shared file (every tab routes through it). It MUST be Phase 1.
- `StreakBlock.tsx` + `StreakMilestoneCard.tsx` are imported by both `you.tsx` (Lane C) and `onboarding/index.tsx` (Lane F). They MUST be Phase 1.
- `MicroLabel`, `HairlineRule`, `Avatar`, `Score`, `Txt`, `PrimaryButton` are imported by every Lane. They are Phase 1.
- `StatLine.tsx` is imported by `you.tsx` (Lane C) and `player/[id].tsx` (also Lane C). Same lane — safe. Belongs to Lane C, NOT Phase 1.
- `TabPill.tsx` is imported by `(tabs)/index.tsx` (Lane A) and `onboarding/index.tsx` (Lane F). It MUST be Phase 1, or one lane must wait on the other.
- `ShareCard.tsx` / `BattleShareCard.tsx` / `StreakMilestoneCard.tsx` are capture targets — their visual must stay coherent across screens that share them. Promote to Phase 1.

---

## 9. Open Questions for the User

1. **The missing teardown file.** `strava-design-teardown.md` was referenced as the visual source of truth but doesn't exist. Will you paste its contents (or recreate it), or should we stay on the fallback tokens in Section 0?

2. **Domain mismatch.** The prompt describes `takes / calls / byline / edition streak / clips`, but the current app is leaderboards / battles / verified-stat / cosign / streak. Map intended:
   - `byline` → existing You-tab masthead + `player/[id].tsx` (already implemented).
   - `edition streak` → existing daily-return streak (already implemented via `StreakBlock`, `useStreak`, `recordActivity`).
   - `takes / calls / clips` → **not implemented**. Should Lanes B and D be deferred until after Phase 2 visual refactor, or should they bring net-new screens (Section 8)?

3. **5-tab plan.** Today there are 3 tabs (Boards, Battles, You) + 1 prominent CTA on each. A 5-tab Strava bar implies adding two more. Options: (a) Boards / Battles / **Create** (center) / **Feed-or-Clips** / You. Which two new tabs? What is the center create button's primary action — open `StatEntrySheet`, or push a brand-new `/clips/new` route?

4. **Inter vs Geist.** Geist is currently loaded and is geometric/Vercel-aesthetic; Inter is the Strava-utilitarian spec. Confirm swap to Inter (and which weights — minimum 500/600/700, maybe 400/500/600/700/800)?

5. **Condensed display face.** Bebas Neue / Anton was listed as optional (TBD). Use it for big "EVERYWHERE / TOP X% / DAY STREAK" hero numerals, or stay all-Inter with weight 800?

6. **Score numeral font.** Currently Geist Mono tabular for big counters. Keep mono-tabular (good for stat readability) or move to Inter tabular?

7. **Ember shade.** Current ember is `#D9430F` (light) / `#FF5A2C` (dark), not `#FC5200`. Confirm we swap to `#FC5200` + `#CC4200` pressed for both palettes (then drop the light/dark ember split)?

8. **Icon stack.** Lucide is installed and in use. Keep Lucide (just standardize on 2px stroke + filled-active siblings), or switch icon libraries?

9. **Theme API.** Keep the `useTheme()` hook returning `{ colors, isDark }`, or rebuild the theme contract (e.g., add `theme.semantic.cta`, `theme.semantic.label`, etc.)? Strava-style flat tokens vs Elevate's 8-token "every value justified" model is a real choice.

10. **Identifier rename (Section 7).** Five questions bundled — pick yes/no for each:
    - Rename iOS `CFBundleDisplayName` from `MARGIN` to `Elevate`? (visible app name — low risk, high value)
    - Rename the deep-link scheme `margin` → `elevate`? (requires Supabase + Google OAuth updates — coordinate)
    - Rotate iOS bundle ID `com.margin.app` → `com.elevate.app` (or similar)? (requires new App Store entry, new push certs, new Google iOS OAuth client — high risk, do not bundle with UI work)
    - Rename `package.json` `name` field `margin` → `elevate`?
    - Rename top-level folder `margin/` → `elevate/`? (cosmetic, breaks user's IDE/AI memory paths)

11. **Dead code.** Can we delete `/state/user.ts` (unused mock store) and `/types/index.ts` (NBA athlete types not referenced)? Both unrelated to live app; safe but visible diff.

12. **`MarginRefresh.tsx`.** Currently UNUSED — no `RefreshControl` consumer found in any screen. Delete, or rename to `ElevateRefresh` and actually wire it into the pull-to-refresh on `you.tsx` and `(tabs)/index.tsx`?

---

## 10. User Decisions (locked 2026-05-30)

These supersede Section 9 wherever they conflict. Phase 1 and Phase 2 lanes follow these without re-asking.

### Scope
- **Build Calls + Clips net-new** in addition to restyling existing screens.
- "Takes", "calls", "clips" are net-new product surfaces. Screens are built as visual scaffolding using real data shapes where possible; data wiring (Supabase queries, mutations) is out of scope for this refactor and is the user's follow-up. Lanes building these screens should:
  - Wire up navigation and presentational layout
  - Build placeholder/empty states that look correct
  - Surface obvious TODO comments where Supabase hooks belong (so user can wire later)
  - **NOT invent or change any Supabase schema**

### Tab bar (Phase 1 owns)
- **5 tabs:** Boards / Battles / [+] / **Clips** / You (Streak surfaces inside /you, not in tab bar).
- **Center [+] button:** orange circle, taps open an **action sheet** with 4 options: **Log stat / Post take / Make call / Add clip**.
- Active state = filled-orange icon + label. Inactive = `#6B6B6B` line icon.
- `BottomTabBar.tsx` is REPLACED in Phase 1.

### Routing additions (Phase 1 stubs + Lane registers in `(tabs)/_layout`)
- `/app/(tabs)/clips.tsx` — vertical TikTok-style clip feed (NEW tab screen)
- `/app/calls/index.tsx` — calls feed list (NEW stack screen)
- `/app/calls/new.tsx` — make-a-call composer with ConfidenceMeter 1–10 (NEW)
- `/app/calls/[id].tsx` — single call detail (NEW)
- `/app/takes/new.tsx` — post-a-take composer (NEW; takes feed defer — they surface inline on Boards/You for now)
- `/app/clips/new.tsx` — clip composer (record/import + caption; uses expo-video which is installed)
- `/app/clips/[id].tsx` — single clip player chrome (NEW)
- Confirm route (`/confirm/*`) STAYS as deep-linked stack (not surfaced in tab bar).

### Typography
- **Inter only.** Weights: 400, 500, 600, 700, 800.
- Score numerals use **Inter Tabular** (Inter has tabular-figs feature; or fallback to Geist Mono if Inter tabular is unreliable in RN).
- Drop Instrument Serif. Drop Geist (regular + medium + semibold). Drop GeistMono unless needed for score fallback.
- No condensed display face (no Bebas Neue / Anton).

### Color
- **Two-palette model with Strava neutrals + #FC5200 brand orange.** Keep the 8-token API; replace values.
- **Light palette:**
  - `paper` → `#FFFFFF` (was cream `#F8F6F1`)
  - `surface` → `#F7F7F7` (raised neutral)
  - `ink` → `#1A1A1A` (was `#0A0A0A`)
  - `ash` → `#6B6B6B` (label gray)
  - `shadow` → `#8E8E93` (secondary label gray)
  - `fog` → `#E5E5E5` (divider)
  - `ember` → `#FC5200` (was `#D9430F`)
  - `void` → `#000000`
- **Dark palette:**
  - `paper` → `#121212` (was `#0F0E0C`)
  - `surface` → `#1E1E1E`
  - `ink` → `#F5F5F5` (was `#EDEAE3`)
  - `ash` → `#A0A0A0`
  - `shadow` → `#8E8E93`
  - `fog` → `#2A2A2A`
  - `ember` → `#FC5200` (was `#FF5A2C` — same orange in both modes per Strava)
  - `void` → `#000000`
- **Add:** `emberPressed: #CC4200` (same in both palettes) for active/pressed CTA state.
- **Orange rule:** ≤~10% of any screen. CTAs / active tab / streak flame / one hero stat per screen only.

### Rename (Phase 1 + early Phase 2)
- **Flip:** doc title in `FEATURE_AUDIT.md` and `supabase/README.md`, "MarginRefresh" reference in `README.md`.
- **Flip:** `ios/MARGIN/Info.plist` `CFBundleDisplayName` `MARGIN` → `Elevate` (visible home-screen app name).
- **Rename:** `components/motion/MarginRefresh.tsx` → `components/motion/ElevateRefresh.tsx` (file + export name; currently unused so blast radius is just the README reference).
- **DO NOT TOUCH:** bundle ID `com.margin.app`, scheme `margin`, package.json `name`, folder `margin/`, iOS native folder name, pbxproj product name. These are deferred.

### Dead code
- **Leave alone.** Do not delete `/state/user.ts`, `/types/index.ts`, or `MarginRefresh.tsx` (latter is renamed not deleted, per above).

### Lane assignments (final, supersedes Section 8)

Phase 1 (sequential, single agent):
1. New theme tokens (`/theme/colors.ts`, `/theme/type.ts`, `/theme/index.ts`)
2. Inter font loader rewire in `/app/_layout.tsx`
3. New primitives: `StatBlock`, `Card`, `AppIcon`, `ConfidenceMeter`, `SocialActionRow`, `AvatarMeta`
4. Updated primitives: `Text` (Txt), `MicroLabel`, `HairlineRule`, `PrimaryButton`, `Avatar`, `PressableScale`
5. Updated motion: `Score`, `RollUpNumber` (font swap), `ElevateRefresh` (renamed)
6. Replaced composite: `BottomTabBar` (5 tabs + orange center create button with action sheet)
7. Reskinned composites Phase 1 owns because they cross lanes: `StreakBlock`, `StreakMilestoneCard`, `TabPill`, `ShareCard`, `BattleShareCard`, `StatLine`/`VerifiedMark`
8. Updated `(tabs)/_layout.tsx` to register Clips tab + create-button action sheet
9. Rename `MarginRefresh.tsx` → `ElevateRefresh.tsx` + update README reference
10. Flip iOS `CFBundleDisplayName` `MARGIN` → `Elevate`

Phase 2 lanes (parallel, after Phase 1 lands):
- **Lane A — Boards (home/feed analogue):** `/app/(tabs)/index.tsx`
- **Lane B — Calls (net-new):** `/app/calls/index.tsx`, `/app/calls/new.tsx`, `/app/calls/[id].tsx`, `/app/takes/new.tsx`
- **Lane C — Byline (You + Player):** `/app/(tabs)/you.tsx`, `/app/player/[id].tsx`
- **Lane D — Clips (net-new + tab screen):** `/app/(tabs)/clips.tsx`, `/app/clips/[id].tsx`, `/app/clips/new.tsx`
- **Lane E — Create flow (sheets):** `/components/composite/StatEntrySheet.tsx`, `/components/composite/ProfileEditSheet.tsx`
- **Lane F — Chrome (auth/onboarding/confirm/splash/root layout, headers):** `/app/_layout.tsx` (header opts only, NOT font loader — Phase 1 owns), `/app/splash.tsx`, `/app/(auth)/*`, `/app/onboarding/index.tsx`, `/app/confirm/index.tsx`, `/app/confirm/[statId].tsx`
- **Lane G — Battles:** `/app/(tabs)/battles.tsx`

Off-limits constants for ALL Phase 2 lanes: `/theme/**`, `/components/primitives/**`, `/components/composite/BottomTabBar.tsx`, `/components/composite/StreakBlock.tsx`, `/components/composite/StreakMilestoneCard.tsx`, `/components/composite/TabPill.tsx`, `/components/composite/ShareCard.tsx`, `/components/composite/BattleShareCard.tsx`, `/components/composite/StatLine.tsx`, `/components/motion/**`, `/app/(tabs)/_layout.tsx`, `/app/_layout.tsx` font loader / Inter wiring.

---

*Plan generated by Phase 0 recon agent. Decisions section recorded; Phase 1 dispatch is next.*
