# Elevate — Read-Only Feature Audit

Project: Expo / React Native + Supabase. Live Supabase project `ilhcvnpzmhugzbxiqmdd`. Audit is read-only; no files or DB rows were modified. Live DB state at audit time: **1 profile, 0 player_stats, 0 verified stats, 0 verification_requests, 17 schools (all geocoded), 23 metrics, 0 follows/blocks/reports.**

---

## 1. Honest summary

The **data plumbing is real**: Boards reads two genuine Postgres RPCs (`leaderboard`, `my_percentile`), Battles compares real `player_stats` rows, You loads/writes a real profile, and RLS + block-aware reads are correctly written and applied. The filter pills actually re-query, the percentile math is real, the plausibility trigger is server-authoritative, and the age gate is enforced both client- and DB-side.

But the thing the whole product is built around — **verification — is a stub**. Inserting a `verification_requests` row *is* the entire backend; nothing and nobody ever flips `player_stats.verified` to `true` (no admin path, no trigger, no reviewer). Because Boards only ranks `verified = true` rows and Battles only counts "official" (both-verified) rows, **the leaderboards and head-to-head tally are structurally empty forever** under the shipped code. Worse, the RLS update policy on `player_stats` is column-unrestricted, so a user *can* set their own `verified = true` via a raw API call — verification is simultaneously impossible through the UI and trivially forgeable outside it. Layer on top: 0 stats exist in the live DB (everything is untested with data), there is **no in-app way to set/edit your profile or primary sport** (yet Battles tells you to "set your primary sport on the You tab"), media "upload" is a deliberate local no-op, and two `catch {}` blocks silently swallow stat-write failures. What's genuinely shippable: onboarding, age/EULA gate, schools/nearby, blocks/reports, and the *read* paths. What only looks done: verification, Boards/Battles as a populated experience, profile editing, follows, and anything resembling a retention loop.

---

## 2. Feature status table

| Feature | Tab/System | Status | Evidence (path:line) | What's needed to make it WIRED |
|---|---|---|---|---|
| Leaderboard ranking | Boards | **WIRED** | `app/(tabs)/index.tsx:102-116`; `supabase/migrations/0006_leaderboards.sql:21-129` | Real, but needs verified stats to ever exist (see verification) |
| Sport / scope / metric pills | Boards | **WIRED** | `app/(tabs)/index.tsx:103,119` (all in queryKey → re-query) | Nothing; pills are real, not cosmetic |
| Percentile ("TOP x%") | Boards | **WIRED** | `app/(tabs)/index.tsx:118-130`; `0006_leaderboards.sql:139-219` | Real ceil-percentile over verified+plausible pop; returns null if no ranked self-stat |
| School / nearby / everyone scope | Boards | **WIRED** | `0006_leaderboards.sql:57-88` (nearby uses viewer's *school* coords, 80km haversine) | Needs schools with geo (present) + peers with stats |
| Zero-peers empty state | Boards | **WIRED** | `app/(tabs)/index.tsx:265-276` | Guides "Be the first verified name" |
| Opponent search by handle | Battles | **WIRED** | `app/(tabs)/battles.tsx:107`; `lib/hooks/usePlayerProfile.ts:168-184` | Real ilike on same-sport profiles |
| "At your school" list | Battles | **WIRED** | `battles.tsx:108`; `usePlayerProfile.ts:187-202` | Real; empty if `school_id` null or no peers |
| Comparison + winner logic | Battles | **WIRED** | `battles.tsx:34-38,117-130` | `lower_better` handled correctly |
| OFFICIAL vs NOT-COUNTED split | Battles | **WIRED (logic) / mostly dead (data)** | `battles.tsx:124-133` | Logic correct (`verified && is_plausible` both sides); but no stat is ever verified → "official" always empty |
| Share battle card (capture/share) | Battles | **WIRED on device** | `battles.tsx:145-155`; `components/composite/BattleShareCard.tsx` | Works on device; silent no-op on simulator (`catch {}`) |
| Profile load / headline / stat lines | You | **WIRED** | `app/(tabs)/you.tsx:38-92`; `usePlayerProfile.ts:81-112` | Real |
| Add / edit stat | You | **WIRED** | `components/composite/StatEntrySheet.tsx:102-128` (upsert) | Real upsert; **save failure swallowed** (`:121`) |
| Metric catalog | Add stats | **WIRED, DB-driven** | `usePlayerProfile.ts:114-128`; seed `0002_player_model.sql:280-320` (23 rows: FB 5, BB 5, BSB 5, Track 8) | Complete per sport |
| Plausibility check | Add stats | **WIRED (server-authoritative)** | trigger `0005_…:13-42`; client mirror `usePlayerProfile.ts:65-72` | Trigger recomputes server-side; client cannot fake |
| Share card (You) | You | **WIRED on device** | `you.tsx:95-105`; `components/composite/ShareCard.tsx` | Same simulator no-op caveat |
| Sign out | You | **WIRED** | `you.tsx:48-57`; `lib/auth.ts:180-183` | Real, with error surface |
| **Verify a stat (any method)** | Verification | **STUBBED** | `StatEntrySheet.tsx:130-155`; `0005_…:44-71` | A reviewer/admin path or trigger that sets `verified=true`; nothing does today |
| Video proof upload | Verification | **STUBBED (local no-op)** | `StatEntrySheet.tsx:134-138` ("nothing is uploaded") | Real Storage upload + bucket + reference column |
| External source | Verification | **MISSING** | `StatEntrySheet.tsx:298-300` ("COMING SOON", disabled) | Everything |
| Admin / moderation review | Verification + Reports | **MISSING** | no admin table/role/UI; `reports` insert-only (`useModeration.ts:26-39`) | Admin role, review queue, status workflow |
| Age gate (13+) | Onboarding/identity | **WIRED (client + DB trigger)** | `app/(auth)/age-gate.tsx:42-94`; trigger `0001_…:32-55` | Real |
| EULA acceptance | Onboarding/identity | **WIRED** | `app/(auth)/eula.tsx:54-82` | Real |
| Handle uniqueness | Onboarding/identity | **WIRED** | client check `onboarding/index.tsx:70-89`; DB `UNIQUE (handle)` (verified live: `profiles_handle_key`) | Real (constraint violation on race is swallowed, though) |
| Onboarding persist | Onboarding | **WIRED (school skippable)** | `onboarding/index.tsx:156-180` | School optional via "SKIP FOR NOW" (`:410`) |
| Edit profile / primary sport / display name / avatar | You/identity | **MISSING** | no editor anywhere in `app/(tabs)/you.tsx`; display_name only set at Apple sign-in `auth.ts:166-173` | A profile-edit screen writing `profiles` |
| nearby_schools RPC + location | Location | **WIRED** | `onboarding/index.tsx:119-149`; `0004_…:14-49` | Used only in onboarding; coords never stored |
| Schools data | Location | **WIRED** | seed `0004_…:56-78` (17 real HS, geocoded) | Real |
| Blocks | Social | **WIRED** | `useModeration.ts:41-63`; RLS `0002_…:258-272`; UI `player/[id].tsx:62-85` | Real + block-aware reads |
| Reports | Social | **WIRED (insert-only)** | `useModeration.ts:26-39`; UI `player/[id].tsx:190-213` | Insert works; no review consumes them |
| Follows | Social | **MISSING in UI / dead hook** | table+RLS `0002_…:138-147,232-245`; but `lib/hooks/useFollows.ts:14-18` queries the **old dropped shape** (`athlete_id`/`user_id`) and is **called nowhere** | New `useFollows` against `follower_id/following_id` + follow UI |
| Email OTP sign-in | Auth | **MISSING in UI** | functions exist `auth.ts:39-55`; sign-in screen only shows Google/Apple `app/(auth)/sign-in.tsx:88-109` | Wire the OTP UI |
| Streaks / daily loop / gamification | Gamification | **MISSING** | only vestigial dead columns `edition_streak`/`streak_freezes_remaining` (`database.types.ts:150,162`); `state/user.ts:51` "no-op placeholder until streak roll-up is wired" | A streak table/RPC, a daily action, and UI — none exist |
| `athlete/[id]` route | (orphan) | **MOCK** | `app/athlete/[id].tsx:13,22` reads `data/fixtures/athletes.ts`; not navigated to anywhere | Dead fixture screen; nothing links to it |
| Typed Supabase client | Cross-cutting | **STUBBED** | `lib/database.types.ts:3` "not yet wired into the Supabase client"; `lib/supabase.ts:20` untyped `createClient` | `createClient<Database>(…)` + drop `as unknown as` casts |

---

## 3. Stubbed traps (ranked by how likely a user hits it)

1. **Verification does nothing — and the whole app revolves around it.** `StatEntrySheet.requestVerification` (`StatEntrySheet.tsx:130-155`) inserts a `verification_requests` row and updates only `verification_method`; it never sets `verified`. No trigger, function, or admin path flips `verified=true` (confirmed: triggers on `player_stats` are only `plausibility` + `updated_at`; migrations contain no verify-mutation). The UI even says "We'll mark it once it's confirmed" (`:290-292`) — nobody confirms. **Every user who adds a stat and taps "GET VERIFIED" hits this immediately.** Consequence cascade: Boards only ranks `verified AND is_plausible` (`0006_…:104-106`) → empty board; Battles "OFFICIAL · VERIFIED ONLY" requires both verified (`battles.tsx:124-125`) → tally always `0–0`.

2. **Self-verification is forgeable via raw API (security).** RLS "Users update own player_stats" (`0002_…:221-225`) gates only on `profile_id = auth.uid()` with no column restriction, so a user can `update player_stats set verified=true` on their own row directly through PostgREST. The UI never does this, but the door is open — verification is both impossible in-app and trivially spoofable out of it.

3. **No way to set/edit your profile or primary sport — and Battles sends you there.** Battles shows "Set your primary sport on the You tab to battle" (`battles.tsx:178-181`) when `primary_sport` is null, but the You tab has **no profile editor** (`you.tsx` only has stat entry + sign-out). The only place `primary_sport` is set is onboarding (`onboarding/index.tsx:167`). If a user somehow has it null, Battles is a permanent dead-end.

4. **Silent stat-save failure.** `StatEntrySheet.save` wraps the upsert in `try { … } catch {}` (`StatEntrySheet.tsx:106-128`) then unconditionally calls `onSaved()` and dismisses. A failed write (RLS, network) looks identical to success; the stat just silently isn't there on refresh.

5. **Media "upload."** Video proof uses `DocumentPicker` then explicitly discards the file (`StatEntrySheet.tsx:134-138`, comment: "nothing is uploaded"). Looks like an upload; stores nothing.

6. **Share on simulator.** `captureRef`/`Sharing` wrapped in `catch {}` (`you.tsx:95-105`, `battles.tsx:145-155`) — silently does nothing where share targets are unavailable.

7. **Onboarding "DONE/SKIP" swallows the profile write.** `finish()` (`onboarding/index.tsx:156-180`) catches and ignores the `profiles.update`, then navigates away. If the write fails, `onboarded` is never set → the route guard (`_layout.tsx:147,153`) bounces the user back to onboarding with no error shown.

8. **Follows hook is dead and broken.** `useFollows`/`useToggleFollow` (`lib/hooks/useFollows.ts`) query the old `follows(user_id, athlete_id)` shape dropped in `0002_…:20`; they'd 400 if called — but grep shows they're called nowhere. Pure dead code masquerading as a feature.

---

## 4. Missing for the core loop (daily retention)

There is **no retention loop of any kind**. Concretely absent:

- **Streaks:** no streak table, no RPC, no hook, no UI. The only artifacts are vestigial columns `edition_streak` / `streak_freezes_remaining` on `profiles` (`database.types.ts:150,162`, leftover from a prior "edition" news app) and a literal no-op in `state/user.ts:51` (`/* no-op placeholder until streak roll-up is wired */`). Nothing reads or writes them in the player app.
- **Daily activity / "today" surface:** none. No notifications, no daily prompt, no "you moved up N spots" event. `app/splash.tsx` exists but no daily check-in.
- **A reason to return:** the loop *should* be add-stat → get-verified → climb-board → battle-rivals → share. The verify step is broken (trap #1), so the loop never closes. To make daily retention real you'd need, minimally: (a) a working verification path so boards populate; (b) follows wired into a feed/"rivals updated" surface (table exists, UI doesn't); (c) some recurring event (new stat from a followed athlete, rank change, weekly board reset) + push; (d) a streak table + nightly job + UI if streaks are intended.
- **Notifications/push:** not present anywhere in the codebase.

---

## 5. Open questions (need live confirmation or a product decision)

1. **Who is supposed to verify stats?** No admin role, table, or reviewer UI exists. Is verification meant to be manual ops via the Supabase dashboard, an external service, or an unbuilt admin app? This is the single biggest product decision blocking the core loop.
2. **Is column-level RLS on `player_stats.verified` intended to be locked down?** Today a user can self-verify via raw API. Should `verified`/`verification_method` be made server-controlled (trigger/RPC) so clients can't write them?
3. **Are the vestigial `profiles` columns** (`edition_streak`, `streak_freezes_remaining`, `following_sports`, `theme_preference`, `comments_enabled`, `cross_school_dms_enabled`, `school` text) intended to be revived (streaks/settings) or dropped? They're dead in the player app but still in the schema.
4. **Is `data/fixtures/*` + `state/user.ts` + `app/athlete/[id].tsx` + `lib/hooks/useProfile.ts` + `lib/hooks/useFollows.ts` slated for deletion?** They reference a prior product and the pre-`0002` schema; `useFollows` would error if ever called.
5. **Email OTP**: the helpers (`auth.ts:39-55`) are built but no UI exposes them. Intended as a fallback, or abandoned for Google/Apple only?
6. **Theme/color discipline:** `theme/colors.ts` defines the canonical 6 values, and `VerifiedMark` correctly conveys verified state with fill-vs-outline (no extra color, `StatLine.tsx:10-42`). One violation: hardcoded red `#C0392B` in `app/(auth)/sign-in.tsx:115`. Tabular-nums rule is honored in numeric inputs (`onboarding/index.tsx:246`, `StatEntrySheet.tsx:159`). Is the sign-in red an intentional exception?

---

## Cross-cutting notes (verified)

- OAuth deep-link redirect is handled in `app/_layout.tsx:104-112` (and again in `auth.ts:113-121` via `openAuthSessionAsync`) — both call `exchangeCodeForSession`, a possible double-exchange race, but the second is caught.
- Token refresh on foreground is wired (`lib/supabase.ts:31-37`).
- Queries call `supabase.auth.getUser()` per-fetch rather than reading session, which is correct but chatty.
- Security advisor flags only one item: leaked-password protection disabled (not relevant to OAuth-only sign-in).
