-- Run this in the Supabase SQL editor. Safe to run more than once.

create table if not exists public.vitals (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  heart_rate  int  not null check (heart_rate between 20 and 250),
  systolic    int  not null check (systolic between 50 and 260),
  diastolic   int  not null check (diastolic between 30 and 160),
  weight      numeric(5,1) not null check (weight between 1 and 500),
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null check (char_length(content) <= 5000),
  created_at  timestamptz not null default now()
);

-- Blood sugar in mg/dL (optional). Added with ALTER so existing databases are upgraded too.
alter table public.vitals add column if not exists blood_sugar int;
alter table public.vitals drop constraint if exists vitals_blood_sugar_check;
alter table public.vitals add constraint vitals_blood_sugar_check check (blood_sugar is null or blood_sugar between 20 and 600);

create index if not exists vitals_user_created_idx   on public.vitals   (user_id, created_at desc);
create index if not exists messages_user_created_idx on public.messages (user_id, created_at);

-- Row Level Security: each user can only touch their own rows
alter table public.vitals   enable row level security;
alter table public.messages enable row level security;

drop policy if exists "vitals: read own"    on public.vitals;
drop policy if exists "vitals: insert own"  on public.vitals;
drop policy if exists "vitals: delete own"  on public.vitals;
drop policy if exists "messages: read own"  on public.messages;
drop policy if exists "messages: insert own" on public.messages;
drop policy if exists "messages: delete own" on public.messages;

create policy "vitals: read own"    on public.vitals   for select using (auth.uid() = user_id);
create policy "vitals: insert own"  on public.vitals   for insert with check (auth.uid() = user_id);
create policy "vitals: delete own"  on public.vitals   for delete using (auth.uid() = user_id);
create policy "messages: read own"  on public.messages for select using (auth.uid() = user_id);
create policy "messages: insert own" on public.messages for insert with check (auth.uid() = user_id);
create policy "messages: delete own" on public.messages for delete using (auth.uid() = user_id);

-- Analysed medical reports (only the results are stored, never the uploaded file)
create table if not exists public.reports (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  parameters  jsonb not null default '[]',
  summary     text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);
alter table public.reports enable row level security;
drop policy if exists "reports: read own"   on public.reports;
drop policy if exists "reports: insert own" on public.reports;
drop policy if exists "reports: delete own" on public.reports;
create policy "reports: read own"   on public.reports for select using (auth.uid() = user_id);
create policy "reports: insert own" on public.reports for insert with check (auth.uid() = user_id);
create policy "reports: delete own" on public.reports for delete using (auth.uid() = user_id);
