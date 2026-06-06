-- ─────────────────────────────────────────────────────────────────────────────
-- Property Story Platform — Foundation schema
--
-- Tables: profiles, listings, scenes, moments, assets, leads
-- Security: RLS — owners get full CRUD on their rows; anonymous visitors can
-- read published listings (and their scenes/moments/assets) and insert leads.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type public.listing_status as enum ('draft', 'published');
  end if;
end$$;

-- ── profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       text not null default 'agent',
  created_at timestamptz not null default now()
);

-- ── listings ─────────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  slug         text not null unique,
  status       public.listing_status not null default 'draft',

  -- address / classification
  address_line text,
  city         text,
  state        text,
  postal_code  text,
  listing_type text,
  occupancy    text,

  -- presentation (jsonb keeps the schema flexible during the platform build)
  hero       jsonb not null default '{}'::jsonb,  -- { title, subtitle, intro_narrative }
  facts      jsonb not null default '{}'::jsonb,  -- { beds, baths, sqft, year_built, lot_size, features[], extra[] }
  contact    jsonb not null default '{}'::jsonb,  -- { agent_name, brokerage, phone, sms, email, listing_url, mls }
  branding   jsonb not null default '{}'::jsonb,  -- { logo_path, colors{}, cta[] }
  seo        jsonb not null default '{}'::jsonb,  -- { meta_description, og_title, og_description, og_image }
  open_house jsonb,                               -- { date, start_time, end_time, notes }

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_owner_id_idx on public.listings (owner_id);
create index if not exists listings_status_idx on public.listings (status);

-- ── scenes ───────────────────────────────────────────────────────────────────
create table if not exists public.scenes (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  position   int not null default 0,
  key        text not null,
  label      text not null
);

create index if not exists scenes_listing_id_idx on public.scenes (listing_id);

-- ── moments ──────────────────────────────────────────────────────────────────
create table if not exists public.moments (
  id                  uuid primary key default gen_random_uuid(),
  scene_id            uuid not null references public.scenes (id) on delete cascade,
  position            int not null default 0,
  image_path          text,
  frame_sequence_path text,
  is_title            boolean not null default false,
  eyebrow             text,
  title               text not null default '',
  subtitle            text,
  body                text,
  align               text not null default 'left',
  scroll_vh           int
);

create index if not exists moments_scene_id_idx on public.moments (scene_id);

-- ── assets ───────────────────────────────────────────────────────────────────
create table if not exists public.assets (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.listings (id) on delete cascade,
  storage_path        text not null,
  original_name       text,
  category            text,
  scene_key           text,
  is_hero             boolean not null default false,
  width               int,
  height              int,
  frame_sequence_path text,
  created_at          timestamptz not null default now()
);

create index if not exists assets_listing_id_idx on public.assets (listing_id);

-- ── leads ────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  name       text,
  contact    text,
  message    text,
  source     text default 'web',
  created_at timestamptz not null default now()
);

create index if not exists leads_listing_id_idx on public.leads (listing_id);

-- ── triggers ─────────────────────────────────────────────────────────────────

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Maintain listings.updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.scenes   enable row level security;
alter table public.moments  enable row level security;
alter table public.assets   enable row level security;
alter table public.leads    enable row level security;

-- profiles: a user manages only their own profile.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- listings: owner full CRUD; anyone can read published listings.
drop policy if exists listings_owner_all on public.listings;
create policy listings_owner_all on public.listings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings
  for select using (status = 'published');

-- scenes: owner full CRUD via parent listing; public read when listing published.
drop policy if exists scenes_owner_all on public.scenes;
create policy scenes_owner_all on public.scenes
  for all
  using (exists (
    select 1 from public.listings l
    where l.id = scenes.listing_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.listings l
    where l.id = scenes.listing_id and l.owner_id = auth.uid()
  ));

drop policy if exists scenes_public_read on public.scenes;
create policy scenes_public_read on public.scenes
  for select using (exists (
    select 1 from public.listings l
    where l.id = scenes.listing_id and l.status = 'published'
  ));

-- moments: owner full CRUD via scene -> listing; public read when published.
drop policy if exists moments_owner_all on public.moments;
create policy moments_owner_all on public.moments
  for all
  using (exists (
    select 1 from public.scenes s
    join public.listings l on l.id = s.listing_id
    where s.id = moments.scene_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.scenes s
    join public.listings l on l.id = s.listing_id
    where s.id = moments.scene_id and l.owner_id = auth.uid()
  ));

drop policy if exists moments_public_read on public.moments;
create policy moments_public_read on public.moments
  for select using (exists (
    select 1 from public.scenes s
    join public.listings l on l.id = s.listing_id
    where s.id = moments.scene_id and l.status = 'published'
  ));

-- assets: owner full CRUD via listing; public read when listing published.
drop policy if exists assets_owner_all on public.assets;
create policy assets_owner_all on public.assets
  for all
  using (exists (
    select 1 from public.listings l
    where l.id = assets.listing_id and l.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.listings l
    where l.id = assets.listing_id and l.owner_id = auth.uid()
  ));

drop policy if exists assets_public_read on public.assets;
create policy assets_public_read on public.assets
  for select using (exists (
    select 1 from public.listings l
    where l.id = assets.listing_id and l.status = 'published'
  ));

-- leads: anyone may submit a lead for a published listing; owner reads theirs.
drop policy if exists leads_public_insert on public.leads;
create policy leads_public_insert on public.leads
  for insert with check (exists (
    select 1 from public.listings l
    where l.id = leads.listing_id and l.status = 'published'
  ));

drop policy if exists leads_owner_select on public.leads;
create policy leads_owner_select on public.leads
  for select using (exists (
    select 1 from public.listings l
    where l.id = leads.listing_id and l.owner_id = auth.uid()
  ));

drop policy if exists leads_owner_delete on public.leads;
create policy leads_owner_delete on public.leads
  for delete using (exists (
    select 1 from public.listings l
    where l.id = leads.listing_id and l.owner_id = auth.uid()
  ));
