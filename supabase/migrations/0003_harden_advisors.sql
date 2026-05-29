-- Migration: harden_advisors
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- Clears the advisor warnings surfaced after 0002:
--   * Performance (auth_rls_initplan): wrap auth.uid() in (select auth.uid())
--     in the STEP 2 profiles own-row policies so it is evaluated once per query.
--   * Security (function_search_path_mutable): pin search_path on the two
--     pre-existing trigger functions.
--   * Security (security definer executable via RPC): revoke EXECUTE on the
--     handle_new_user trigger function from the API roles (it is only ever
--     invoked by the auth.users trigger, never directly).

-- Pin search_path on pre-existing trigger functions.
alter function public.touch_updated_at() set search_path = '';
alter function public.enforce_min_age() set search_path = '';

-- handle_new_user (auth.users trigger) and rls_auto_enable (DDL event trigger)
-- are trigger-only SECURITY DEFINER functions; they should not be callable via
-- PostgREST. EXECUTE defaults to PUBLIC, so revoke from PUBLIC (+ API roles).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Re-create STEP 2 profiles own-row policies with (select auth.uid()).
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = id);
