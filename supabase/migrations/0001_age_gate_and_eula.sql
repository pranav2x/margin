-- Migration: age_gate_and_eula
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- Additive + idempotent. Safe to re-run.
--
-- Adds the age-gate / EULA columns to public.profiles, server-side 13+
-- enforcement, email capture on profile creation, and a self-delete policy
-- used to purge an auto-created profile row for a blocked under-13 user.

-- 1. Columns
alter table public.profiles add column if not exists birth_year int;
alter table public.profiles add column if not exists age_band text;
alter table public.profiles add column if not exists eula_accepted_at timestamptz;
alter table public.profiles add column if not exists email text;

-- 2. age_band allowed values: middle/high-school + adult bands.
--    '13_15' = ages 13-15, '16_18' = ages 16-18, '19_plus' = 19 and older.
--    Under 13 is never allowed (no band; rejected by trigger below).
alter table public.profiles drop constraint if exists profiles_age_band_check;
alter table public.profiles
  add constraint profiles_age_band_check
  check (age_band is null or age_band in ('13_15', '16_18', '19_plus'));

-- 3. birth_year sanity bounds (the hard 13+ rule is enforced by the trigger,
--    since it depends on the current date and cannot live in a CHECK).
alter table public.profiles drop constraint if exists profiles_birth_year_check;
alter table public.profiles
  add constraint profiles_birth_year_check
  check (birth_year is null or (birth_year between 1900 and 2100));

-- 4. Server-side 13+ enforcement. Rejects any insert/update whose birth_year
--    implies an age under 13. Also derives is_minor (< 18) for convenience.
create or replace function public.enforce_min_age()
returns trigger
language plpgsql
as $$
declare
  current_yr int := extract(year from now())::int;
  computed_age int;
begin
  if new.birth_year is not null then
    computed_age := current_yr - new.birth_year;
    if computed_age < 13 then
      raise exception 'MARGIN requires users to be at least 13 years old.'
        using errcode = 'check_violation';
    end if;
    new.is_minor := computed_age < 18;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_min_age on public.profiles;
create trigger profiles_min_age
  before insert or update on public.profiles
  for each row execute function public.enforce_min_age();

-- 5. Capture email on profile creation (extends existing handle_new_user).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

-- 6. Allow a user to delete their own profile row (used to purge an
--    auto-created row when an under-13 user is blocked client-side).
drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);
