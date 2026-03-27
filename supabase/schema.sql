create extension if not exists pgcrypto;

create table if not exists public.app_data (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id bigint primary key,
  name text not null,
  cat text,
  ask text,
  status text,
  amount numeric default 0,
  notes text default '',
  link text default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id bigint primary key,
  title text not null,
  date text,
  time text,
  dur numeric default 1,
  type text,
  who text default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id bigint primary key,
  title text not null,
  tag text default '',
  cat text default '',
  date text default '',
  status text default 'draft',
  cover text default '',
  body text default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.looks (
  id bigint primary key,
  event_name text default '',
  round_name text default '',
  title text default '',
  description text default '',
  img text default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id bigint primary key,
  day text default '',
  focus text default '',
  exercises jsonb not null default '[]'::jsonb,
  notes text default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint primary key,
  from_role text default '',
  to_role text default '',
  body text default '',
  time text default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id bigint primary key,
  name text not null,
  size bigint default 0,
  file_type text default '',
  folder text default 'Personal',
  data text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.mood_board (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  src text not null,
  label text default '',
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;
alter table public.sponsors enable row level security;
alter table public.calendar_events enable row level security;
alter table public.posts enable row level security;
alter table public.looks enable row level security;
alter table public.workouts enable row level security;
alter table public.messages enable row level security;
alter table public.files enable row level security;
alter table public.mood_board enable row level security;

drop policy if exists "public app_data access" on public.app_data;
create policy "public app_data access" on public.app_data for all using (true) with check (true);

drop policy if exists "public sponsors access" on public.sponsors;
create policy "public sponsors access" on public.sponsors for all using (true) with check (true);

drop policy if exists "public calendar_events access" on public.calendar_events;
create policy "public calendar_events access" on public.calendar_events for all using (true) with check (true);

drop policy if exists "public posts access" on public.posts;
create policy "public posts access" on public.posts for all using (true) with check (true);

drop policy if exists "public looks access" on public.looks;
create policy "public looks access" on public.looks for all using (true) with check (true);

drop policy if exists "public workouts access" on public.workouts;
create policy "public workouts access" on public.workouts for all using (true) with check (true);

drop policy if exists "public messages access" on public.messages;
create policy "public messages access" on public.messages for all using (true) with check (true);

drop policy if exists "public files access" on public.files;
create policy "public files access" on public.files for all using (true) with check (true);

drop policy if exists "public mood_board access" on public.mood_board;
create policy "public mood_board access" on public.mood_board for all using (true) with check (true);
