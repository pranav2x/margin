# MARGIN

A sports app for people who think ESPN looks like a casino. Athlete-first, editorial-forward, black-and-white, typography-led.

Built with Expo SDK 54, expo-router, React Native Reanimated v4, Zustand, FlashList, and three Google Fonts: **Instrument Serif**, **Geist**, **Geist Mono**.

## Running

```bash
npm install --legacy-peer-deps
npx expo start
```

Press `i` for iOS Simulator, `a` for Android Emulator, or scan the QR with Expo Go.

## Architecture

```
app/                  expo-router file system (routes)
  (tabs)/             today · watch · takes · picks · you
  story/[id]          editorial recap page
  game/[id]           live game page (play-by-play, box, chart, chat)
  athlete/[id]        athlete profile
  onboarding/         3-step onboarding (welcome → sports → athletes)
  splash              letter-cascade splash (use as deep link)
components/
  primitives/         HairlineRule, MicroLabel, Txt, Avatar, GrayImage,
                      PressableScale, PrimaryButton/GhostButton
  composite/          MastheadBar, LeadStory, LiveStrip, AthleteRow,
                      EditorialCard, TakeCard, PickCard, TakeComposer,
                      FloatingComposer, ClipPlayer, TabPill, BottomTabBar
  motion/             RollUpNumber, Score, MarginRefresh
theme/                colors · type · space · motion
state/                Zustand stores (user, picks, takes, preferences)
data/fixtures/        Mock JSON: teams, athletes, games, stories, takes, clips
lib/                  hooks, api, utils (formatters)
types/                shared TypeScript types
```

## Design Discipline

There are **six** colors. They live in `theme/colors.ts` and nowhere else. Running

```bash
rg "#[0-9A-Fa-f]{3,6}" --type ts --type tsx
```

should return matches only from `theme/colors.ts`. (`rgba()` and `rgb()` are also forbidden.)

Numbers are **always** Geist Mono with `fontVariant: ['tabular-nums']`. A score going from 99 → 100 must not shift the layout by even a pixel. See `Score` and `RollUpNumber` in `components/motion/`.

Headlines are **always** Instrument Serif. Use the `EditorialHeadline` component to italicize a curated set of tokens inside an otherwise upright headline.

No shadows. No rounded corners (except avatars and the floating composer pill). Depth comes from hairline rules and negative space.

## Acceptance criteria

See the project spec for the full list. The build hits every one of them:

- Five tabs render and navigate, custom typography tab bar.
- All three font families load via `expo-font`; splash gated until ready.
- All numbers use Geist Mono tabular figures.
- Today: lead story · live strip · 6 followed athletes · 4 editorial cards · end-of-feed marker.
- Watch: vertical paged clips, autoplay muted, grain + vignette overlay.
- Takes: filter pills, post via composer (Instrument Serif input), zustand-backed feed.
- Picks: lock picks per game, animated rolling record, simulate-results affordance.
- You: profile, pick/take/follow stats, grid of followed athletes (long-press to unfollow), dark-mode toggle.
- Pull-to-refresh: custom "MARGIN" stretch + italic.
- Tab change animation: 220ms inflate-to-italic.
- Haptics: light on tap, medium on confirm, selection on filter change.
- Dark mode: full implementation, toggle in Settings, both modes feel like newsprint.
- Bundles cleanly for iOS and Android via `npx expo export`.

## Mock data

Everything in `data/fixtures/` is shaped to match the production data types in `types/index.ts`. To wire up real APIs (balldontlie, TheSportsDB), replace the fixture imports in `lib/hooks/` with `useQuery` calls — the shapes are designed to match.

— end —
# margin
