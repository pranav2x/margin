# Elevate — Supabase schema

Live project: **marginios** (ref `ilhcvnpzmhugzbxiqmdd`).

**Source of truth = the ordered files in `supabase/migrations/`.** Apply them in
order. `supabase/schema.sql` is the original (news-era) bootstrap kept only for
history — the news tables it defines (`calls`, `takes`, `take_reactions`) were
dropped in `0002_player_model.sql`, and `follows` was reshaped.

## Migrations

| File | What it does |
| --- | --- |
| `0001_age_gate_and_eula.sql` | Age-gate + EULA columns on `profiles`, `enforce_min_age()` 13+ trigger, email capture, self-delete policy. |
| `0002_player_model.sql` | Player-first model: drops news tables, adds `schools` / `sport_metrics` / `player_stats` / `reports` / `blocks`, reshapes `follows`, RLS (block-aware reads), seeds the metric catalog. |
| `0003_harden_advisors.sql` | Clears Supabase advisor warnings: `(select auth.uid())` in profile policies, pinned `search_path`, revoked RPC `EXECUTE` on trigger-only functions. |

## Tables

- **profiles** — one row per `auth.users` id. Player identity + settings.
  Player-first columns: `handle` (unique), `display_name`, `school_id` → `schools`,
  `grad_year`, `primary_sport` (`football|basketball|baseball|track`). Age-gate
  columns from STEP 2: `birth_year`, `age_band`, `eula_accepted_at`, `email`,
  `is_minor` (derived). The legacy text `school` column is retained for now.
- **schools** — `name`, `city`, `state`, `latitude`, `longitude`. Used for
  school / nearby leaderboards. Read-only to clients.
- **sport_metrics** — the **metric catalog** (read-only to clients). See below.
- **player_stats** — one upsertable row per `(profile_id, metric_id)`. Holds the
  athlete's `value`, `verified` flag + `verification_method`, server-derived
  `is_plausible`, and `notes` (e.g. track split detail).
- **follows** — directed edges `(follower_id, following_id)`; `follower_id <> following_id`.
- **reports** — `reporter_id` → `target_profile_id`, `reason`. Private to reporter.
- **blocks** — `(blocker_id, blocked_id)`; powers mutual content exclusion.

### `verification_method` enum (on `player_stats`)

`self_reported` (default) · `video_proof` · `coach_cosign` · `peer_cosign` ·
`external_source`. `verified` is a separate boolean an athlete/mod can flip once a
method is satisfied.

### Age bands

Same bands as the STEP 2 age gate, derived from `birth_year`:

- `13_15` — ages 13–15
- `16_18` — ages 16–18
- `19_plus` — ages 19 and older

Under 13 is rejected (client + `enforce_min_age()` trigger), so there is no band
for it.

## Metric catalog (`sport_metrics`)

Each row defines one metric for one sport:

- `sport` — `football | basketball | baseball | track`
- `key` — stable machine id (e.g. `40_yard_dash`); unique per `(sport, key)`
- `label` — display name (e.g. `40-Yard Dash`)
- `unit` — display unit (see assumptions below)
- `direction` — `higher_better` or `lower_better` (drives leaderboard sort)
- `min_13_15` / `max_13_15` / `min_16_18` / `max_16_18` / `min_19_plus` / `max_19_plus`
  — **plausibility bounds per age band** (numeric, nullable; `NULL` = open on that side)
- `sort_order` — display order within a sport

### What plausibility bounds mean

When a `player_stats` row is inserted/updated, the `compute_stat_plausibility()`
trigger looks up the bounds for the athlete's `age_band` and sets
`is_plausible = (value within [min, max])`. Bounds are intentionally **wide**:
they exist to catch the absurd (a 13-year-old "benching 500 lbs" or running a
"3.9s 40") — never the legitimately elite competitive case. An implausible value
is still stored (`is_plausible = false`) so it can be flagged, not silently
dropped.

### Units & scale assumptions

- Football: `40_yard_dash` & `pro_shuttle_5_10_5` in **seconds** (lower better);
  `bench_press_1rm` in **lbs**; `vertical_jump` & `broad_jump` in **inches**.
- Basketball: `points/rebounds/assists per game` as counts; `vertical_jump` in
  **inches**; `three_point_pct` on a **0–100** scale.
- Baseball: `batting_average` on a **.000–1.000 decimal** scale (e.g. `0.350`);
  `era` = earned runs per 9 (lower better); `exit_velocity` & `throwing_velocity`
  in **mph**; `sixty_yard_dash` in **seconds**.
- Track: running events (`track_100m … track_1600m`) are **time in seconds**
  (lower better) — `track_1600m` stores the 1600 m time in seconds. Field events
  (`track_long_jump`, `track_high_jump`, `track_shot_put`) are **meters** (higher
  better). The `player_stats.notes` field can hold split detail.

Launch catalog = **23 metrics**: football 5, basketball 5, baseball 5, track 8.

### Editing plausibility bounds

Bounds are plain columns — edit them with a single `update`, e.g.:

```sql
update public.sport_metrics
set max_13_15 = 300          -- tighten the 13–15 bench ceiling
where sport = 'football' and key = 'bench_press_1rm';
```

Re-running the seed block in `0002_player_model.sql` is also safe: it uses
`on conflict (sport, key) do update`, so editing the values there and re-applying
resets every bound to the file. Add a new metric by adding a row to that seed.

## Row Level Security

RLS is enabled on every table. Summary:

- **Public read (leaderboards are public):** any authenticated user can `select`
  `profiles`, `player_stats`, `sport_metrics`, `schools`, `follows`.
- **Write-own-only:** a user may insert/update/delete only their own `profile`,
  their own `player_stats` (`profile_id = auth.uid()`), and their own
  `follows` / `reports` / `blocks` (actor id = `auth.uid()`).
- **`sport_metrics` & `schools`:** read-only to clients (no write policies).
- **`reports`:** private — only the reporter can read their reports.

### Block exclusion

`profiles` and `player_stats` have block-aware `select` policies. A row for
profile *X* is visible to viewer *V* only when **no block exists in either
direction** between them:

```sql
using (
  not exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = <row owner>)
       or (b.blocker_id = <row owner> and b.blocked_id = (select auth.uid()))
  )
)
```

So if V blocked X **or** X blocked V, V sees neither X's profile nor X's stats
(and vice-versa). This replaced STEP 2's "anyone can view profiles" policy.
