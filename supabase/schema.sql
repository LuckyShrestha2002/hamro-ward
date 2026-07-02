-- ============================================================================
-- Hamro Ward — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- It is safe to re-run: it uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (already enabled on Supabase, but be safe).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- Optional, lightweight "users" table (no auth — just deduping reporters).
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  contact     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.reports (
  id              uuid primary key default gen_random_uuid(),
  tracking_id     text unique,                       -- e.g. CMP-2026-0001 (set by trigger)
  category        text not null,
  severity        text,                              -- Low | Medium | High
  description_en  text,
  description_np  text,
  ward            text,
  municipality    text,
  location        text,                              -- landmark / address text
  latitude        double precision,                  -- set in the map phase
  longitude       double precision,
  reporter_name   text,
  contact         text,
  nibedan         text,                              -- Nepali निवेदन
  english_letter  text,                              -- bilingual phase
  recommendation  jsonb,                             -- AI recommendation phase
  image_url       text,
  status          text not null default 'Reported',  -- Reported | Under Review | In Progress | Resolved
  created_at      timestamptz not null default now()
);

create index if not exists reports_created_at_idx on public.reports (created_at desc);
create index if not exists reports_category_idx   on public.reports (category);
create index if not exists reports_status_idx     on public.reports (status);

create table if not exists public.report_status_history (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports(id) on delete cascade,
  status      text not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists status_history_report_idx
  on public.report_status_history (report_id, created_at);

-- ----------------------------------------------------------------------------
-- Tracking ID generation: CMP-<year>-<0001>, restarting each calendar year.
-- ----------------------------------------------------------------------------

create table if not exists public.report_counters (
  year        int primary key,
  last_value  int not null default 0
);

-- SECURITY DEFINER so the trigger can update report_counters even though that
-- table has RLS enabled with no public policies (it stays inaccessible to anon).
create or replace function public.generate_tracking_id()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  yr  int := extract(year from now())::int;
  nxt int;
  tok text;
begin
  insert into public.report_counters (year, last_value)
  values (yr, 1)
  on conflict (year)
    do update set last_value = public.report_counters.last_value + 1
  returning last_value into nxt;

  -- Random, non-sequential token so tracking IDs can't be guessed/enumerated.
  -- The full ID (incl. token) is the citizen's access credential on /track.
  tok := upper(substring(encode(gen_random_bytes(5), 'hex') from 1 for 6));

  return 'CMP-' || yr || '-' || lpad(nxt::text, 4, '0') || '-' || tok;
end;
$$;

create or replace function public.set_tracking_id()
returns trigger
language plpgsql
as $$
begin
  if new.tracking_id is null then
    new.tracking_id := public.generate_tracking_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_tracking_id on public.reports;
create trigger trg_set_tracking_id
  before insert on public.reports
  for each row execute function public.set_tracking_id();

-- ----------------------------------------------------------------------------
-- Status history: automatically log the initial status and every change.
-- ----------------------------------------------------------------------------

create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.report_status_history (report_id, status)
    values (new.id, new.status);
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.report_status_history (report_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_status on public.reports;
create trigger trg_log_status
  after insert or update on public.reports
  for each row execute function public.log_status_change();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- This demo has no login, so we allow the public (anon) role to read/write.
-- Tighten these policies before any real production deployment.
-- ----------------------------------------------------------------------------

alter table public.reports               enable row level security;
alter table public.report_status_history enable row level security;
alter table public.users                 enable row level security;
-- No policies on report_counters: anon/auth clients cannot touch it directly.
-- Only the SECURITY DEFINER tracking-ID function (running as owner) writes to it.
alter table public.report_counters       enable row level security;

drop policy if exists "public read reports"   on public.reports;
drop policy if exists "public insert reports" on public.reports;
drop policy if exists "public update reports" on public.reports;
create policy "public read reports"   on public.reports for select using (true);
create policy "public insert reports" on public.reports for insert with check (true);
create policy "public update reports" on public.reports for update using (true) with check (true);

drop policy if exists "public read status history"   on public.report_status_history;
drop policy if exists "public insert status history" on public.report_status_history;
create policy "public read status history"   on public.report_status_history for select using (true);
create policy "public insert status history" on public.report_status_history for insert with check (true);

drop policy if exists "public read users"   on public.users;
drop policy if exists "public insert users" on public.users;
create policy "public read users"   on public.users for select using (true);
create policy "public insert users" on public.users for insert with check (true);

-- ----------------------------------------------------------------------------
-- Storage bucket for uploaded photos.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('report-images', 'report-images', true)
on conflict (id) do nothing;

drop policy if exists "public read report images"   on storage.objects;
drop policy if exists "public upload report images" on storage.objects;
create policy "public read report images"
  on storage.objects for select
  using (bucket_id = 'report-images');
create policy "public upload report images"
  on storage.objects for insert
  with check (bucket_id = 'report-images');
