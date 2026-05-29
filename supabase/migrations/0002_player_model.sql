-- Migration: player_model
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- Player-first data model: schools, profiles (extended), sport_metrics catalog,
-- player_stats, follows (reshaped), reports, blocks + RLS (block-aware reads)
-- and a seeded metric catalog. Additive/idempotent where practical.
--
-- PRESERVES the STEP 2 age-gate work on public.profiles (birth_year, age_band,
-- eula_accepted_at, email, enforce_min_age/handle_new_user/touch_updated_at
-- triggers, and the insert/update/delete-own RLS policies). Only the STEP 2
-- "Anyone authenticated can view profiles" SELECT policy is replaced with a
-- block-aware one.

-- ============================================================
-- 0. DROP obsolete news-app tables (calls / takes / take_reactions)
--    and the old follows shape (user_id + athlete_id text).
-- ============================================================
drop table if exists public.take_reactions cascade;
drop table if exists public.takes cascade;
drop table if exists public.calls cascade;
drop table if exists public.follows cascade;

-- ============================================================
-- 1. SCHOOLS
-- ============================================================
create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  state       text,
  latitude    numeric,
  longitude   numeric,
  created_at  timestamptz not null default now()
);

create index if not exists schools_state_idx on public.schools (state);

-- ============================================================
-- 2. PROFILES — add player-first columns (preserve age-gate work)
-- ============================================================
alter table public.profiles add column if not exists school_id uuid references public.schools (id);
alter table public.profiles add column if not exists primary_sport text;

alter table public.profiles drop constraint if exists profiles_primary_sport_check;
alter table public.profiles
  add constraint profiles_primary_sport_check
  check (primary_sport is null or primary_sport in ('football', 'basketball', 'baseball', 'track'));

create index if not exists profiles_school_id_idx on public.profiles (school_id);
create index if not exists profiles_primary_sport_idx on public.profiles (primary_sport);

-- ============================================================
-- 3. SPORT_METRICS — the metric catalog (read-only to clients)
--    Plausibility bounds per age band (same bands as STEP 2):
--    13_15, 16_18, 19_plus. NULL bound = open on that side.
-- ============================================================
create table if not exists public.sport_metrics (
  id           uuid primary key default gen_random_uuid(),
  sport        text not null check (sport in ('football', 'basketball', 'baseball', 'track')),
  key          text not null,
  label        text not null,
  unit         text,
  direction    text not null check (direction in ('higher_better', 'lower_better')),
  min_13_15    numeric,
  max_13_15    numeric,
  min_16_18    numeric,
  max_16_18    numeric,
  min_19_plus  numeric,
  max_19_plus  numeric,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  unique (sport, key)
);

-- ============================================================
-- 4. PLAYER_STATS — one upsertable row per (profile, metric)
-- ============================================================
create table if not exists public.player_stats (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  metric_id           uuid not null references public.sport_metrics (id),
  value               numeric not null,
  verified            boolean not null default false,
  verification_method text not null default 'self_reported'
                      check (verification_method in ('self_reported', 'video_proof', 'coach_cosign', 'peer_cosign', 'external_source')),
  is_plausible        boolean,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (profile_id, metric_id)
);

create index if not exists player_stats_metric_id_idx on public.player_stats (metric_id);
create index if not exists player_stats_profile_id_idx on public.player_stats (profile_id);
-- Leaderboard scans: rows for a metric ordered by value.
create index if not exists player_stats_metric_value_idx on public.player_stats (metric_id, value);

-- updated_at touch (reuses STEP 2 public.touch_updated_at()).
drop trigger if exists player_stats_updated_at on public.player_stats;
create trigger player_stats_updated_at
  before update on public.player_stats
  for each row execute function public.touch_updated_at();

-- Derive is_plausible from the metric's bounds for the profile's age band.
create or replace function public.compute_stat_plausibility()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  band text;
  lo numeric;
  hi numeric;
begin
  select p.age_band into band from public.profiles p where p.id = new.profile_id;

  if band = '13_15' then
    select m.min_13_15, m.max_13_15 into lo, hi from public.sport_metrics m where m.id = new.metric_id;
  elsif band = '16_18' then
    select m.min_16_18, m.max_16_18 into lo, hi from public.sport_metrics m where m.id = new.metric_id;
  else
    -- '19_plus' or unknown/unset age band -> use adult bounds as the default.
    select m.min_19_plus, m.max_19_plus into lo, hi from public.sport_metrics m where m.id = new.metric_id;
  end if;

  new.is_plausible := (lo is null or new.value >= lo) and (hi is null or new.value <= hi);
  return new;
end;
$$;

drop trigger if exists player_stats_plausibility on public.player_stats;
create trigger player_stats_plausibility
  before insert or update on public.player_stats
  for each row execute function public.compute_stat_plausibility();

-- ============================================================
-- 5. FOLLOWS (new shape) / REPORTS / BLOCKS
-- ============================================================
create table if not exists public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_follower_idx on public.follows (follower_id);
create index if not exists follows_following_idx on public.follows (following_id);

create table if not exists public.reports (
  id                 uuid primary key default gen_random_uuid(),
  reporter_id        uuid not null references public.profiles (id) on delete cascade,
  target_profile_id  uuid not null references public.profiles (id) on delete cascade,
  reason             text,
  created_at         timestamptz not null default now()
);

create index if not exists reports_target_idx on public.reports (target_profile_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id);

create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles (id) on delete cascade,
  blocked_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
alter table public.schools        enable row level security;
alter table public.sport_metrics  enable row level security;
alter table public.player_stats   enable row level security;
alter table public.follows        enable row level security;
alter table public.reports        enable row level security;
alter table public.blocks         enable row level security;

-- ---- SCHOOLS: public read, no client writes ----
drop policy if exists "Authenticated can view schools" on public.schools;
create policy "Authenticated can view schools"
  on public.schools for select to authenticated using (true);

-- ---- SPORT_METRICS: read-only catalog, no client writes ----
drop policy if exists "Authenticated can view sport_metrics" on public.sport_metrics;
create policy "Authenticated can view sport_metrics"
  on public.sport_metrics for select to authenticated using (true);

-- ---- PROFILES: replace STEP 2 "select all" with a block-aware SELECT ----
drop policy if exists "Anyone authenticated can view profiles" on public.profiles;
drop policy if exists "Public can view non-blocked profiles" on public.profiles;
create policy "Public can view non-blocked profiles"
  on public.profiles for select to authenticated
  using (
    not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = profiles.id)
         or (b.blocker_id = profiles.id and b.blocked_id = (select auth.uid()))
    )
  );
-- (STEP 2 insert/update/delete-own profile policies are left intact.)

-- ---- PLAYER_STATS: block-aware read + write-own ----
drop policy if exists "Public can view non-blocked player_stats" on public.player_stats;
create policy "Public can view non-blocked player_stats"
  on public.player_stats for select to authenticated
  using (
    not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = player_stats.profile_id)
         or (b.blocker_id = player_stats.profile_id and b.blocked_id = (select auth.uid()))
    )
  );

drop policy if exists "Users insert own player_stats" on public.player_stats;
create policy "Users insert own player_stats"
  on public.player_stats for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists "Users update own player_stats" on public.player_stats;
create policy "Users update own player_stats"
  on public.player_stats for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Users delete own player_stats" on public.player_stats;
create policy "Users delete own player_stats"
  on public.player_stats for delete to authenticated
  using (profile_id = (select auth.uid()));

-- ---- FOLLOWS: public read of edges, write-own (actor = follower) ----
drop policy if exists "Authenticated can view follows" on public.follows;
create policy "Authenticated can view follows"
  on public.follows for select to authenticated using (true);

drop policy if exists "Users insert own follows" on public.follows;
create policy "Users insert own follows"
  on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));

drop policy if exists "Users delete own follows" on public.follows;
create policy "Users delete own follows"
  on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- ---- REPORTS: private to the reporter, write-own ----
drop policy if exists "Users view own reports" on public.reports;
create policy "Users view own reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));

drop policy if exists "Users insert own reports" on public.reports;
create policy "Users insert own reports"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

-- ---- BLOCKS: visible to either party, write-own (actor = blocker) ----
drop policy if exists "Users view own blocks" on public.blocks;
create policy "Users view own blocks"
  on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));

drop policy if exists "Users insert own blocks" on public.blocks;
create policy "Users insert own blocks"
  on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Users delete own blocks" on public.blocks;
create policy "Users delete own blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- ============================================================
-- 7. SEED sport_metrics — launch metrics + conservative middle/high-school
--    plausibility bounds per age band. Bounds catch the absurd, never the
--    competitive case. Idempotent via ON CONFLICT (sport, key).
--    Units & scale assumptions are documented in supabase/README.md.
-- ============================================================
insert into public.sport_metrics
  (sport, key, label, unit, direction, min_13_15, max_13_15, min_16_18, max_16_18, min_19_plus, max_19_plus, sort_order)
values
  -- Football
  ('football', '40_yard_dash',       '40-Yard Dash',        's',   'lower_better',  4.5, 9.0, 4.3, 8.5, 4.3, 8.5, 1),
  ('football', 'bench_press_1rm',    'Bench Press (1RM)',   'lbs', 'higher_better', 45,  315, 45,  500, 45,  700, 2),
  ('football', 'vertical_jump',      'Vertical Jump',       'in',  'higher_better', 5,   42,  5,   48,  5,   50,  3),
  ('football', 'broad_jump',         'Broad Jump',          'in',  'higher_better', 30,  130, 30,  145, 30,  155, 4),
  ('football', 'pro_shuttle_5_10_5', '5-10-5 Pro Shuttle',  's',   'lower_better',  3.9, 7.0, 3.8, 6.5, 3.8, 6.5, 5),
  -- Basketball
  ('basketball', 'points_per_game',   'Points / Game',     'pts', 'higher_better', 0, 60,  0, 70,  0, 70,  1),
  ('basketball', 'rebounds_per_game', 'Rebounds / Game',   'reb', 'higher_better', 0, 30,  0, 35,  0, 35,  2),
  ('basketball', 'assists_per_game',  'Assists / Game',    'ast', 'higher_better', 0, 25,  0, 25,  0, 25,  3),
  ('basketball', 'vertical_jump',     'Vertical Jump',     'in',  'higher_better', 5, 42,  5, 48,  5, 50,  4),
  ('basketball', 'three_point_pct',   'Three-Point %',     '%',   'higher_better', 0, 100, 0, 100, 0, 100, 5),
  -- Baseball  (batting_average scale: .000-1.000 decimal; ERA earned runs per 9)
  ('baseball', 'batting_average',   'Batting Average',    'AVG', 'higher_better', 0,   1,   0,   1,   0,   1,   1),
  ('baseball', 'era',               'ERA',                'ERA', 'lower_better',  0,   27,  0,   27,  0,   27,  2),
  ('baseball', 'exit_velocity',     'Exit Velocity',      'mph', 'higher_better', 30,  105, 30,  115, 30,  125, 3),
  ('baseball', 'sixty_yard_dash',   '60-Yard Dash',       's',   'lower_better',  6.3, 10,  6.0, 10,  6.0, 10,  4),
  ('baseball', 'throwing_velocity', 'Throwing Velocity',  'mph', 'higher_better', 30,  90,  30,  100, 30,  110, 5),
  -- Track  (running events are time in seconds; field events are meters)
  ('track', 'track_100m',       '100 m',      's', 'lower_better',  10.5, 20,  10.0, 18,  9.5,  18,  1),
  ('track', 'track_200m',       '200 m',      's', 'lower_better',  21.0, 45,  20.0, 40,  19.0, 40,  2),
  ('track', 'track_400m',       '400 m',      's', 'lower_better',  47,   120, 45,   100, 43,   100, 3),
  ('track', 'track_800m',       '800 m',      's', 'lower_better',  115,  300, 105,  240, 100,  240, 4),
  ('track', 'track_1600m',      '1600 m',     's', 'lower_better',  255,  720, 235,  600, 225,  600, 5),
  ('track', 'track_long_jump',  'Long Jump',  'm', 'higher_better', 1.0,  7.5, 1.0,  8.2, 1.0,  9.0, 6),
  ('track', 'track_high_jump',  'High Jump',  'm', 'higher_better', 0.8,  2.1, 0.8,  2.3, 0.8,  2.45, 7),
  ('track', 'track_shot_put',   'Shot Put',   'm', 'higher_better', 1.0,  18,  1.0,  23,  1.0,  25,  8)
on conflict (sport, key) do update set
  label       = excluded.label,
  unit        = excluded.unit,
  direction   = excluded.direction,
  min_13_15   = excluded.min_13_15,
  max_13_15   = excluded.max_13_15,
  min_16_18   = excluded.min_16_18,
  max_16_18   = excluded.max_16_18,
  min_19_plus = excluded.min_19_plus,
  max_19_plus = excluded.max_19_plus,
  sort_order  = excluded.sort_order;
