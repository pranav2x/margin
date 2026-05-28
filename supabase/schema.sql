-- MARGIN — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- ============================================================
-- 1. PROFILES (merges user + preferences stores)
-- ============================================================
create table public.profiles (
  id                        uuid primary key references auth.users on delete cascade,
  display_name              text,
  handle                    text unique,
  avatar_url                text,
  grad_year                 int,
  school                    text,
  edition_streak            int not null default 0,
  streak_freezes_remaining  int not null default 1,
  following_sports          text[] not null default '{}',
  theme_preference          text not null default 'system'
                            check (theme_preference in ('system', 'light', 'dark')),
  comments_enabled          boolean not null default false,
  cross_school_dms_enabled  boolean not null default false,
  is_minor                  boolean not null default true,
  onboarded                 boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. FOLLOWS
-- ============================================================
create table public.follows (
  user_id     uuid not null references auth.users on delete cascade,
  athlete_id  text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, athlete_id)
);

create index follows_user_id_idx on public.follows (user_id);

-- ============================================================
-- 3. CALLS
-- ============================================================
create table public.calls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  game_id     text not null,
  selection   text not null,
  confidence  int check (confidence between 1 and 10),
  result      text not null default 'pending'
              check (result in ('pending', 'win', 'loss')),
  filed_at    timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, game_id)
);

create index calls_user_id_idx on public.calls (user_id);

-- ============================================================
-- 4. TAKES
-- ============================================================
create table public.takes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  body        text not null check (char_length(body) between 1 and 240),
  topic       text,
  created_at  timestamptz not null default now()
);

create index takes_created_at_idx on public.takes (created_at desc);
create index takes_topic_idx on public.takes (topic);

-- ============================================================
-- 5. TAKE REACTIONS
-- ============================================================
create table public.take_reactions (
  take_id     uuid not null references public.takes on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  reaction    text not null check (reaction in ('respond', 'cosign', 'dispute')),
  created_at  timestamptz not null default now(),
  primary key (take_id, user_id)
);

create index take_reactions_take_id_idx on public.take_reactions (take_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- Profiles
alter table public.profiles enable row level security;

create policy "Anyone authenticated can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Follows
alter table public.follows enable row level security;

create policy "Users can view their own follows"
  on public.follows for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own follows"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own follows"
  on public.follows for delete
  to authenticated
  using (auth.uid() = user_id);

-- Calls
alter table public.calls enable row level security;

create policy "Users can view their own calls"
  on public.calls for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own calls"
  on public.calls for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own calls"
  on public.calls for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own calls"
  on public.calls for delete
  to authenticated
  using (auth.uid() = user_id);

-- Takes
alter table public.takes enable row level security;

create policy "Anyone authenticated can view takes"
  on public.takes for select
  to authenticated
  using (true);

create policy "Users can insert their own takes"
  on public.takes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own takes"
  on public.takes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own takes"
  on public.takes for delete
  to authenticated
  using (auth.uid() = user_id);

-- Take Reactions
alter table public.take_reactions enable row level security;

create policy "Anyone authenticated can view take reactions"
  on public.take_reactions for select
  to authenticated
  using (true);

create policy "Users can insert their own reactions"
  on public.take_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own reactions"
  on public.take_reactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own reactions"
  on public.take_reactions for delete
  to authenticated
  using (auth.uid() = user_id);
