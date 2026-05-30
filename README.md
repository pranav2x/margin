# Elevate

Elevate is a player-model app for student athletes: report your stats, see where
they rank, and go head-to-head with other athletes. Black-and-white,
typography-led, and built to feel like newsprint — not a casino.

Built with Expo SDK 54, expo-router, React Query, Supabase (auth + Postgres +
RLS), React Native Reanimated v4, FlashList, and Zustand. Three Google Fonts:
**Instrument Serif**, **Geist**, **Geist Mono**.

## Running

```bash
npm install --legacy-peer-deps
npx expo start
```

Press `i` for the iOS Simulator, `a` for an Android Emulator, or open a
development build. The Supabase client reads `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` from the environment (see `lib/supabase.ts`).

## The app

Three tabs, nothing else:

- **Boards** — leaderboards. Pick a sport, a metric, and a scope (your school,
  nearby, or everyone). Only verified marks are ranked; an opt-in toggle reveals
  unverified entries below the line. Your standing reads as a positive percentile
  ("TOP 12%"). Tapping a row opens that athlete's profile.
- **Battles** — head-to-head. Find another athlete in your sport (by handle, or
  from your school) and line up your stats. Only metrics that are verified on
  **both** sides count toward the official tally; everything else is shown but
  not counted.
- **You** — your profile and stat lines. Add or edit stats, edit your profile
  (sport, name, school, avatar), and share a black-and-white stat card.

### The player model

Every athlete owns a `profile` (handle, display name, grad year, primary sport,
school) and a set of `player_stats`. Stats are typed against a per-sport
`sport_metrics` catalog that also encodes age-band plausibility bounds, so an
out-of-range mark is flagged rather than silently trusted. Supporting tables:
`schools`, `verification_requests`, `follows`, `blocks`, and `reports`.
Leaderboards and percentiles come from Postgres RPCs (`leaderboard`,
`my_percentile`); school discovery uses `nearby_schools`.

### Verification — peer co-sign, no hard gate

Stats are **self-reported and appear immediately**, badged **Verified** or
**Unverified**. A stat becomes verified only when a **same-school peer co-signs
it** — `verified` is server-controlled and can't be flipped by the athlete who
reported the number. Verified marks are the ones that rank on Boards and count in
Battles; unverified marks stay visible, just not ranked. (The co-sign flow itself
lands in a later phase; today the editor lets an athlete request verification.)

### Onboarding & gate

First run walks through: sign-in (Google / Apple) → age gate → terms + community
rules → onboarding (handle, grad year, sport, then school via one-shot location
or manual search). The route guard in `app/_layout.tsx` enforces that order, and
every gate write surfaces its own errors instead of failing silently.

## Design discipline

Color lives only in `theme/colors.ts`. Today the palette is **six** values
(`ink`, `paper`, `fog`, `ash`, `shadow`, `void`) across light and dark; it will
**expand to eight** in **Phase 4**, introducing the one accent (`ember`). There
are no other color literals anywhere — no `#hex`, no `rgba()`.

Numbers are **always** Geist Mono with `fontVariant: ['tabular-nums']` — a score
going 99 → 100 must not shift the layout by a pixel (see `Score` and
`RollUpNumber` in `components/motion/`). Headlines are **always** Instrument
Serif. No shadows and no rounded corners, except avatars and the composer pill.
Depth comes from hairline rules and negative space.

## Project layout

```
app/
  (auth)/             sign-in · age-gate · eula · rules
  (tabs)/             boards (index) · battles · you
  onboarding/         handle → grad year → sport → school
  player/[id]         read-only player profile
  splash              letter-cascade splash
  _layout.tsx         fonts, session, route guard
components/
  primitives/         Txt, MicroLabel, HairlineRule, Avatar, PrimaryButton
  composite/          BottomTabBar, TabPill, StatLine, StatEntrySheet,
                      ShareCard, BattleShareCard
  motion/             RollUpNumber, Score, MarginRefresh (pull-to-refresh wordmark)
theme/                colors · type · space · motion
state/                Zustand stores (preferences)
lib/                  supabase client, auth helpers, hooks
                      (usePlayerProfile, useModeration)
lib/database.types.ts Supabase-generated types
supabase/             SQL schema, migrations, and notes
```

## Safety

Elevate is for student athletes and enforces a 13+ age gate at sign-up. It is
**not** a betting, wagering, or prize product — there are no odds, no money, and
no gambling language anywhere in the app. Stats and friendly competition only.

— end —
