-- ─── GeoQuest Initial Schema ──────────────────────────────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- ─── 1. profiles ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  username    text        not null,
  gold_balance integer    not null default 0,
  created_at  timestamptz not null default now()
);

-- Row-Level Security
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ─── 2. owned_countries ───────────────────────────────────────────────────────

create table if not exists public.owned_countries (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  country_code text        not null,          -- ISO 3166-1 alpha-2
  purchased_at timestamptz not null default now(),
  unique(user_id, country_code)               -- prevent duplicate ownership
);

alter table public.owned_countries enable row level security;

create policy "Users can read their own owned countries"
  on public.owned_countries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own owned countries"
  on public.owned_countries for insert
  with check (auth.uid() = user_id);

-- ─── 3. quiz_results ─────────────────────────────────────────────────────────

create table if not exists public.quiz_results (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  quiz_type   text        not null check (quiz_type in ('flag', 'shape', 'borders', 'millionaire')),
  score       integer     not null default 0,
  gold_earned integer     not null default 0,
  played_at   timestamptz not null default now()
);

alter table public.quiz_results enable row level security;

create policy "Users can read their own quiz results"
  on public.quiz_results for select
  using (auth.uid() = user_id);

create policy "Users can insert their own quiz results"
  on public.quiz_results for insert
  with check (auth.uid() = user_id);

-- ─── 4. Auto-create profile on signup ────────────────────────────────────────
-- This function fires whenever a new auth.users row is created,
-- so sign-ups without a username use the email prefix as a fallback.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
