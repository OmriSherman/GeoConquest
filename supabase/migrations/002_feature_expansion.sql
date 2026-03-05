-- ─── GeoQuest Feature Expansion ───────────────────────────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- ─── 1. countries table (cache from REST Countries API) ─────────────────────

create table if not exists public.countries (
  cca2        text        primary key,
  name        text        not null,
  flag_url    text        not null,
  population  bigint      not null default 0,
  area        double precision not null default 0,
  borders     text[]      not null default '{}',
  region      text        not null default '',
  independent boolean     not null default true
);

-- Everyone can read countries
alter table public.countries enable row level security;

create policy "Anyone can read countries"
  on public.countries for select
  using (true);

-- Allow anon/authenticated to insert/update for seeding
create policy "Authenticated users can insert countries"
  on public.countries for insert
  with check (true);

create policy "Authenticated users can update countries"
  on public.countries for update
  using (true);

-- ─── 2. Add country column to profiles ──────────────────────────────────────

alter table public.profiles
  add column if not exists country text;

-- ─── 3. Leaderboard: allow reading other users' profiles (username + id only)

-- Drop the old restrictive policy
drop policy if exists "Users can read their own profile" on public.profiles;

-- New policy: everyone can read all profiles (for leaderboard)
create policy "Anyone can read profiles"
  on public.profiles for select
  using (true);

-- Allow reading all owned_countries (for leaderboard counts)
drop policy if exists "Users can read their own owned countries" on public.owned_countries;

create policy "Anyone can read owned countries"
  on public.owned_countries for select
  using (true);

-- ─── 4. Update handle_new_user to extract Google locale ─────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  _locale text;
  _country text;
begin
  -- Try to extract locale from Google OAuth metadata
  _locale := new.raw_user_meta_data->>'locale';

  -- Extract country code from locale (e.g., 'en-IL' -> 'IL', 'he' -> null)
  if _locale is not null and length(_locale) >= 5 and position('-' in _locale) > 0 then
    _country := upper(split_part(_locale, '-', 2));
  elsif _locale is not null and length(_locale) = 2 then
    -- Some locales are just language codes like 'he', try to map common ones
    _country := null;
  else
    _country := null;
  end if;

  insert into public.profiles (id, username, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    _country
  )
  on conflict (id) do update set
    country = coalesce(public.profiles.country, excluded.country);

  return new;
end;
$$;

-- Recreate trigger
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
