-- Migration: plausibility_and_verification
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- (1) Re-asserts the server-side is_plausible trigger on player_stats so the
--     client can never fake plausibility — the trigger is the source of truth.
-- (2) Adds verification_requests (the verification-flow stub backend).
-- Idempotent.

-- ------------------------------------------------------------
-- 1. Server-side plausibility (source of truth).
--    Recomputes is_plausible from the metric's bounds for the OWNER's age band
--    on every insert/update. NULL bound = open on that side.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 2. verification_requests — backend stub for the verify flow.
--    Inserting a row IS the whole backend; no scraping/verification happens.
-- ------------------------------------------------------------
create table if not exists public.verification_requests (
  id            uuid primary key default gen_random_uuid(),
  stat_id       uuid not null references public.player_stats (id) on delete cascade,
  requester_id  uuid not null references auth.users (id) on delete cascade,
  method        text not null check (method in ('video_proof', 'coach_cosign', 'peer_cosign')),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

create index if not exists verification_requests_stat_idx on public.verification_requests (stat_id);
create index if not exists verification_requests_requester_idx on public.verification_requests (requester_id);

alter table public.verification_requests enable row level security;

drop policy if exists "Users insert own verification_requests" on public.verification_requests;
create policy "Users insert own verification_requests"
  on public.verification_requests for insert to authenticated
  with check (requester_id = (select auth.uid()));

drop policy if exists "Users view own verification_requests" on public.verification_requests;
create policy "Users view own verification_requests"
  on public.verification_requests for select to authenticated
  using (requester_id = (select auth.uid()));
