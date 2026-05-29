-- Migration: schools_and_nearby
-- Applied to Supabase project ilhcvnpzmhugzbxiqmdd (marginios) via MCP apply_migration.
-- Adds the nearby_schools RPC (haversine, read-only, coords never persisted)
-- and seeds a set of real US high schools so the onboarding school picker has
-- data to return. Idempotent.

-- ------------------------------------------------------------
-- 1. nearby_schools RPC
--    Returns the closest schools to a one-shot (lat, lng) the client passes in.
--    SECURITY INVOKER (reads only the public schools table, already RLS-readable
--    by authenticated users), STABLE, search_path pinned. It performs a pure
--    SELECT — it does not log or persist the input coordinates anywhere.
-- ------------------------------------------------------------
create or replace function public.nearby_schools(
  p_lat numeric,
  p_lng numeric,
  p_limit int default 5
)
returns table (
  id          uuid,
  name        text,
  city        text,
  state       text,
  distance_km numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.city,
    s.state,
    (6371 * acos(least(1, greatest(-1,
      cos(radians(p_lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(p_lng))
      + sin(radians(p_lat)) * sin(radians(s.latitude))
    ))))::numeric as distance_km
  from public.schools s
  where s.latitude is not null
    and s.longitude is not null
  order by distance_km asc
  limit greatest(1, least(coalesce(p_limit, 5), 25));
$$;

-- Only signed-in users may call it; anon cannot.
revoke all on function public.nearby_schools(numeric, numeric, int) from public;
grant execute on function public.nearby_schools(numeric, numeric, int) to authenticated;

-- ------------------------------------------------------------
-- 2. Seed real-ish US high schools (idempotent via (name, city)).
-- ------------------------------------------------------------
create unique index if not exists schools_name_city_uidx on public.schools (name, city);

insert into public.schools (name, city, state, latitude, longitude) values
  -- Los Angeles metro
  ('Mater Dei High School',            'Santa Ana',    'CA', 33.7480, -117.8750),
  ('Sierra Canyon School',             'Chatsworth',   'CA', 34.2570, -118.6010),
  ('Harvard-Westlake School',          'Los Angeles',  'CA', 34.1390, -118.4080),
  ('Long Beach Polytechnic High School','Long Beach',  'CA', 33.7870, -118.1680),
  ('Crenshaw High School',             'Los Angeles',  'CA', 33.9890, -118.3330),
  -- New York City metro
  ('Stuyvesant High School',           'New York',     'NY', 40.7170, -74.0140),
  ('Brooklyn Technical High School',   'Brooklyn',     'NY', 40.6890, -73.9770),
  ('Cardinal Hayes High School',       'Bronx',        'NY', 40.8190, -73.9270),
  ('Archbishop Molloy High School',    'Queens',       'NY', 40.7090, -73.8140),
  ('Christ the King Regional High School','Queens',    'NY', 40.7170, -73.8720),
  -- Chicago metro
  ('Whitney M. Young Magnet High School','Chicago',    'IL', 41.8790, -87.6690),
  ('Simeon Career Academy',            'Chicago',      'IL', 41.7440, -87.6240),
  ('Mount Carmel High School',         'Chicago',      'IL', 41.7970, -87.6020),
  ('Curie Metropolitan High School',   'Chicago',      'IL', 41.7930, -87.7260),
  -- Dallas/Fort Worth metro
  ('DeSoto High School',               'DeSoto',       'TX', 32.5890, -96.8570),
  ('Duncanville High School',          'Duncanville',  'TX', 32.6510, -96.9180),
  ('Allen High School',                'Allen',        'TX', 33.1030, -96.6740)
on conflict (name, city) do nothing;
