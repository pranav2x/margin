-- Migration: streaks
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- The daily-return loop. A streak advances on a real core-loop action — adding or
-- updating a stat, co-signing a teammate, or filing a battle — never on merely
-- opening the app. All writes go through record_activity(); the tables are
-- read-only to clients (no direct insert/update/delete grants), mirroring the
-- 0008 cosign_stat pattern.
--
-- "A day" is a single, fixed definition everywhere: the UTC calendar date
-- (now() at time zone 'utc')::date. Picking UTC (not the device's local zone)
-- keeps the server the sole authority — the same instant maps to the same day
-- for every client, so a streak can't be gamed by hopping time zones.

-- ------------------------------------------------------------
-- 1. activity_days — one idempotent row per (profile, day) the user showed up.
--    `frozen` marks a day a freeze bridged (set only by record_activity); it
--    stays false for real activity. The (profile_id, day) PK makes a repeat
--    log on the same day a harmless no-op.
-- ------------------------------------------------------------
create table if not exists public.activity_days (
  profile_id uuid        not null references public.profiles(id) on delete cascade,
  day        date        not null,
  frozen     boolean     not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, day)
);

create index if not exists activity_days_profile_day_idx
  on public.activity_days (profile_id, day desc);

-- ------------------------------------------------------------
-- 2. streaks — one row per profile holding the running tallies.
--    freezes default 2: a small, bounded buffer that bridges the odd missed day.
-- ------------------------------------------------------------
create table if not exists public.streaks (
  profile_id      uuid        primary key references public.profiles(id) on delete cascade,
  current_len     integer     not null default 0,
  longest_len     integer     not null default 0,
  last_active_day date,
  freezes         integer     not null default 2,
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. RLS: authenticated may read (read-true). There is NO write policy, and the
--    default table-wide insert/update/delete grants Supabase hands the API roles
--    are revoked below — so the ONLY writer is the definer record_activity().
-- ------------------------------------------------------------
alter table public.activity_days enable row level security;
alter table public.streaks       enable row level security;

drop policy if exists "read activity_days" on public.activity_days;
create policy "read activity_days" on public.activity_days
  for select to authenticated using (true);

drop policy if exists "read streaks" on public.streaks;
create policy "read streaks" on public.streaks
  for select to authenticated using (true);

revoke insert, update, delete on public.activity_days from anon, authenticated;
revoke insert, update, delete on public.streaks       from anon, authenticated;

-- ------------------------------------------------------------
-- 4. record_activity(): the only path that advances a streak.
--    SECURITY DEFINER with search_path pinned to '' and every reference
--    schema-qualified; granted to authenticated only (revoked from public, anon)
--    — same hardening as 0008. Uses auth.uid() for the profile, so a client can
--    only ever advance its own streak.
--
--    Logic:
--      * log today idempotently (on conflict do nothing);
--      * gap = today - last_active_day:
--          <= 0  already counted today          -> run unchanged (idempotent);
--          = 1   consecutive day                 -> run + 1;
--          = 2   exactly one missed day, freezes -> bridge: run + 1, spend a freeze,
--                and mark the missed day frozen (a retroactive snowflake);
--          else  two+ missed days (or no freeze) -> reset to 1;
--      * longest_len tracks the high-water mark.
--    The freeze is silent — pure server logic with no failure-moment signal. Its
--    only trace is the frozen activity_days row, which the strip later reads as a
--    snowflake; there is never a popup at the missed-day moment.
-- ------------------------------------------------------------
create or replace function public.record_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller  uuid    := (select auth.uid());
  v_today   date    := (now() at time zone 'utc')::date;
  v_last    date;
  v_current integer;
  v_longest integer;
  v_freezes integer;
  v_gap     integer;
begin
  if v_caller is null then
    raise exception 'You must be signed in to record activity.';
  end if;

  -- Today's activity is logged at most once.
  insert into public.activity_days (profile_id, day)
  values (v_caller, v_today)
  on conflict (profile_id, day) do nothing;

  select s.current_len, s.longest_len, s.last_active_day, s.freezes
    into v_current, v_longest, v_last, v_freezes
  from public.streaks s
  where s.profile_id = v_caller;

  if not found then
    -- First ever activity: open a fresh streak at 1.
    insert into public.streaks (profile_id, current_len, longest_len, last_active_day, freezes, updated_at)
    values (v_caller, 1, 1, v_today, 2, now());
    return;
  end if;

  v_gap := v_today - v_last;

  if v_gap <= 0 then
    -- Already counted today (or clock skew): leave the run untouched.
    null;
  elsif v_gap = 1 then
    v_current := v_current + 1;
  elsif v_gap = 2 and v_freezes > 0 then
    -- One missed day, a freeze is available: bridge it and spend the freeze.
    -- Mark the bridged day frozen so the 7-day strip shows a snowflake there
    -- retroactively — the only trace a freeze leaves, and never a popup.
    v_freezes := v_freezes - 1;
    v_current := v_current + 1;
    insert into public.activity_days (profile_id, day, frozen)
    values (v_caller, v_today - 1, true)
    on conflict (profile_id, day) do nothing;
  else
    -- Two or more missed days, or no freeze left: the run resets to today.
    v_current := 1;
  end if;

  if v_current > v_longest then
    v_longest := v_current;
  end if;

  update public.streaks
  set current_len     = v_current,
      longest_len     = v_longest,
      last_active_day = v_today,
      freezes         = v_freezes,
      updated_at      = now()
  where profile_id = v_caller;
end;
$$;

revoke execute on function public.record_activity() from public, anon;
grant  execute on function public.record_activity() to authenticated;
