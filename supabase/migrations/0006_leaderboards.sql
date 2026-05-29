-- Migration: leaderboards
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- Leaderboard + viewer-percentile RPCs for the Boards tab.
--
-- Both functions are STABLE, SECURITY INVOKER (so the block-aware RLS on
-- profiles/player_stats applies as the calling user) with search_path pinned.
-- They ALSO mirror the block-aware predicate explicitly. Nearby scope uses the
-- VIEWER'S SCHOOL coordinates (never device/live location).
--
-- Ranking rules:
--   * Ranked set = verified = true AND is_plausible = true, ordered by the
--     metric's direction (lower_better -> asc, higher_better -> desc).
--   * Implausible (is_plausible = false) rows are never ranked or listed.
--   * When p_only_verified = false, plausible-but-unverified rows are returned
--     with rank = NULL and ranked = false, AFTER the ranked rows — never
--     interleaved into the rank ordering.

-- ------------------------------------------------------------
-- leaderboard(p_sport, p_metric_key, p_scope, p_only_verified, p_limit)
-- ------------------------------------------------------------
create or replace function public.leaderboard(
  p_sport text,
  p_metric_key text,
  p_scope text,
  p_only_verified boolean default true,
  p_limit int default 100
)
returns table (
  rank                int,
  profile_id          uuid,
  handle              text,
  school_name         text,
  value               numeric,
  verified            boolean,
  verification_method text,
  ranked              boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_metric_id uuid;
  v_direction text;
  v_school uuid;
  v_lat numeric;
  v_lng numeric;
  v_radius_km numeric := 80;
begin
  select m.id, m.direction into v_metric_id, v_direction
  from public.sport_metrics m
  where m.sport = p_sport and m.key = p_metric_key;
  if v_metric_id is null then return; end if;

  select pr.school_id into v_school from public.profiles pr where pr.id = v_uid;
  if p_scope = 'nearby' then
    select s.latitude, s.longitude into v_lat, v_lng from public.schools s where s.id = v_school;
  end if;

  return query
  with eligible as (
    select pr.id, pr.handle, sch.name as school_name
    from public.profiles pr
    left join public.schools sch on sch.id = pr.school_id
    where
      (case
        when p_scope = 'school' then pr.school_id = v_school
        when p_scope = 'nearby' then (
          v_lat is not null and pr.school_id is not null and exists (
            select 1 from public.schools s2
            where s2.id = pr.school_id
              and s2.latitude is not null and s2.longitude is not null
              and (6371 * acos(least(1, greatest(-1,
                cos(radians(v_lat)) * cos(radians(s2.latitude)) * cos(radians(s2.longitude) - radians(v_lng))
                + sin(radians(v_lat)) * sin(radians(s2.latitude))
              )))) <= v_radius_km
          )
        )
        else true
      end)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = v_uid and b.blocked_id = pr.id)
           or (b.blocker_id = pr.id and b.blocked_id = v_uid)
      )
  ),
  stats as (
    select e.id as profile_id, e.handle, e.school_name,
           ps.value, ps.verified, ps.verification_method, ps.is_plausible
    from eligible e
    join public.player_stats ps on ps.profile_id = e.id and ps.metric_id = v_metric_id
    where ps.is_plausible is not false
  ),
  ranked_rows as (
    select
      row_number() over (
        order by
          (case when v_direction = 'lower_better' then s.value end) asc nulls last,
          (case when v_direction = 'higher_better' then s.value end) desc nulls last
      )::int as rnk,
      s.profile_id, s.handle, s.school_name, s.value, s.verified, s.verification_method
    from stats s
    where s.verified = true and s.is_plausible = true
  ),
  unranked_rows as (
    select null::int as rnk, s.profile_id, s.handle, s.school_name, s.value, s.verified, s.verification_method
    from stats s
    where s.verified = false and p_only_verified = false
    order by
      (case when v_direction = 'lower_better' then s.value end) asc nulls last,
      (case when v_direction = 'higher_better' then s.value end) desc nulls last
    limit p_limit
  )
  select * from (
    select r.rnk as rank, r.profile_id, r.handle, r.school_name, r.value, r.verified, r.verification_method, true as ranked
    from ranked_rows r
    where r.rnk <= p_limit
    union all
    select u.rnk as rank, u.profile_id, u.handle, u.school_name, u.value, u.verified, u.verification_method, false as ranked
    from unranked_rows u
  ) combined
  order by
    combined.ranked desc,
    combined.rank asc nulls last,
    (case when v_direction = 'lower_better' then combined.value else -combined.value end) asc;
end;
$$;

revoke all on function public.leaderboard(text, text, text, boolean, int) from public;
grant execute on function public.leaderboard(text, text, text, boolean, int) to authenticated;

-- ------------------------------------------------------------
-- my_percentile(p_sport, p_metric_key, p_scope)
-- Viewer's top-N% among the ranked (verified + plausible) population in scope.
-- Returns NULL when the viewer has no ranked stat or the population is empty.
-- ------------------------------------------------------------
create or replace function public.my_percentile(
  p_sport text,
  p_metric_key text,
  p_scope text
)
returns int
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_metric_id uuid;
  v_direction text;
  v_school uuid;
  v_lat numeric;
  v_lng numeric;
  v_radius_km numeric := 80;
  v_my_value numeric;
  v_total int;
  v_better int;
begin
  select m.id, m.direction into v_metric_id, v_direction
  from public.sport_metrics m
  where m.sport = p_sport and m.key = p_metric_key;
  if v_metric_id is null then return null; end if;

  select ps.value into v_my_value
  from public.player_stats ps
  where ps.profile_id = v_uid and ps.metric_id = v_metric_id
    and ps.verified = true and ps.is_plausible = true;
  if v_my_value is null then return null; end if;

  select pr.school_id into v_school from public.profiles pr where pr.id = v_uid;
  if p_scope = 'nearby' then
    select s.latitude, s.longitude into v_lat, v_lng from public.schools s where s.id = v_school;
  end if;

  with eligible as (
    select pr.id
    from public.profiles pr
    where
      (case
        when p_scope = 'school' then pr.school_id = v_school
        when p_scope = 'nearby' then (
          v_lat is not null and pr.school_id is not null and exists (
            select 1 from public.schools s2
            where s2.id = pr.school_id
              and s2.latitude is not null and s2.longitude is not null
              and (6371 * acos(least(1, greatest(-1,
                cos(radians(v_lat)) * cos(radians(s2.latitude)) * cos(radians(s2.longitude) - radians(v_lng))
                + sin(radians(v_lat)) * sin(radians(s2.latitude))
              )))) <= v_radius_km
          )
        )
        else true
      end)
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = v_uid and b.blocked_id = pr.id)
           or (b.blocker_id = pr.id and b.blocked_id = v_uid)
      )
  ),
  pop as (
    select ps.value
    from eligible e
    join public.player_stats ps on ps.profile_id = e.id and ps.metric_id = v_metric_id
    where ps.verified = true and ps.is_plausible = true
  )
  select
    count(*),
    count(*) filter (
      where (v_direction = 'lower_better' and value < v_my_value)
         or (v_direction = 'higher_better' and value > v_my_value)
    )
  into v_total, v_better
  from pop;

  if v_total = 0 then return null; end if;
  return greatest(1, ceil(((v_better + 1)::numeric / v_total) * 100))::int;
end;
$$;

revoke all on function public.my_percentile(text, text, text) from public;
grant execute on function public.my_percentile(text, text, text) to authenticated;
