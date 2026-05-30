-- Migration: peer_cosign
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- Implements the locked verification model: peer co-sign, no hard gate.
--   * A stat becomes verified only when a SAME-SCHOOL peer co-signs it.
--   * `verified` / `verification_method` are SERVER-CONTROLLED — clients can
--     never write them directly (column-level revoke below); the only path is
--     the SECURITY DEFINER cosign_stat() RPC.
--   * RLS still governs every other column, so value/notes updates keep working.

-- ------------------------------------------------------------
-- 1. Lock the trust columns: clients may no longer UPDATE them.
--    NOTE: Supabase grants TABLE-WIDE update to the API roles by default, so a
--    column-level revoke alone is a no-op (the table grant still covers every
--    column — has_column_privilege would still report true). So we drop the
--    table-wide grant and re-grant UPDATE on ONLY the client-editable columns.
--    verified + verification_method are now writable only by the definer
--    cosign_stat(); is_plausible stays owned by the plausibility trigger (a
--    BEFORE trigger can set it regardless of the caller's column grants), and
--    profile_id/metric_id are insert-only. RLS still governs which rows.
-- ------------------------------------------------------------
revoke update (verified, verification_method) on public.player_stats from authenticated, anon;
revoke update on public.player_stats from authenticated, anon;
grant update (value, notes) on public.player_stats to authenticated;

-- ------------------------------------------------------------
-- 2. Co-sign ledger. One row per (stat, cosigner). Writes only via the RPC.
-- ------------------------------------------------------------
create table if not exists public.stat_cosigns (
  stat_id      uuid not null references public.player_stats(id) on delete cascade,
  cosigner_id  uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (stat_id, cosigner_id)
);

create index if not exists stat_cosigns_stat_idx on public.stat_cosigns (stat_id);
create index if not exists stat_cosigns_cosigner_idx on public.stat_cosigns (cosigner_id);

alter table public.stat_cosigns enable row level security;

drop policy if exists "read cosigns" on public.stat_cosigns;
create policy "read cosigns" on public.stat_cosigns for select to authenticated using (true);
-- (No insert/update/delete policy: writes happen only through cosign_stat below,
--  which runs as the definer and bypasses RLS.)

-- ------------------------------------------------------------
-- 3. cosign_stat(p_stat_id): a same-school peer co-signs a mark.
--    SECURITY DEFINER so it can write the locked trust columns; search_path
--    pinned to '' and every reference schema-qualified. Granted to authenticated
--    only (revoked from public, anon) — mirrors the 0003 hardening pattern.
-- ------------------------------------------------------------
create or replace function public.cosign_stat(p_stat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_owner uuid;
  v_owner_school uuid;
  v_caller_school uuid;
begin
  if v_caller is null then
    raise exception 'You must be signed in to confirm a mark.';
  end if;

  -- Owner of the mark being co-signed.
  select ps.profile_id into v_owner
  from public.player_stats ps
  where ps.id = p_stat_id;
  if v_owner is null then
    raise exception 'That mark no longer exists.';
  end if;

  -- No self co-sign.
  if v_owner = v_caller then
    raise exception 'You can''t confirm your own mark.';
  end if;

  -- Same-school only (both must have a school, and they must match).
  select pr.school_id into v_owner_school from public.profiles pr where pr.id = v_owner;
  select pr.school_id into v_caller_school from public.profiles pr where pr.id = v_caller;
  if v_caller_school is null or v_owner_school is null or v_caller_school <> v_owner_school then
    raise exception 'You can only confirm marks from your own school.';
  end if;

  -- Record the co-sign. The PK makes a repeat co-sign a harmless no-op.
  insert into public.stat_cosigns (stat_id, cosigner_id)
  values (p_stat_id, v_caller)
  on conflict (stat_id, cosigner_id) do nothing;

  -- Launch policy: 1 co-sign verifies. To later require 2, gate this on
  --   (select count(*) from public.stat_cosigns where stat_id = p_stat_id) >= 2
  update public.player_stats
  set verified = true,
      verification_method = 'peer_cosign'
  where id = p_stat_id;

  -- Resolve any pending verification_requests for this mark.
  update public.verification_requests
  set status = 'approved'
  where stat_id = p_stat_id
    and status = 'pending';
end;
$$;

revoke execute on function public.cosign_stat(uuid) from public, anon;
grant execute on function public.cosign_stat(uuid) to authenticated;
