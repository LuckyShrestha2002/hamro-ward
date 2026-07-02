-- ============================================================================
-- Hamro Ward — Authentication + Row Level Security hardening
-- Run this in the Supabase SQL Editor AFTER schema.sql. Safe to re-run.
--
-- Model: ward staff authenticate with Supabase Auth (email + password); the
-- public submits/tracks complaints anonymously. So: authenticated = authority.
--
-- One-time setup in the Supabase Dashboard:
--   1. Authentication → Providers → Email: enable it. For a demo, turn OFF
--      "Confirm email" so a new account can sign in immediately.
--   2. Authentication → Sign In / Providers: turn OFF "Allow new users to
--      sign up". CRITICAL — since authenticated == authority, self-signup
--      would grant strangers admin access. Accounts must be created by hand.
--   3. Authentication → Users → "Add user": create your staff login
--      (email + password) with "Auto Confirm User" checked.
--   4. Run this whole file in SQL Editor.
--
-- After this, the anon key can ONLY: submit a report, look up ONE report by
-- its tracking ID, and read a minimal (no-PII) list for duplicate detection —
-- all via the SECURITY DEFINER functions below. It can no longer browse the
-- table, read contact details in bulk, or change any status.
-- ============================================================================

-- ---- reports: authenticated staff only for direct table access ------------
drop policy if exists "public read reports"   on public.reports;
drop policy if exists "public insert reports" on public.reports;
drop policy if exists "public update reports" on public.reports;
drop policy if exists "staff read reports"    on public.reports;
drop policy if exists "staff update reports"  on public.reports;

create policy "staff read reports" on public.reports for select
  using (auth.role() = 'authenticated');
create policy "staff update reports" on public.reports for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
-- (No public INSERT policy: citizen submissions go through create_report().)

-- ---- status history: staff read only --------------------------------------
drop policy if exists "public read status history"   on public.report_status_history;
drop policy if exists "public insert status history" on public.report_status_history;
drop policy if exists "staff read status history"    on public.report_status_history;
create policy "staff read status history" on public.report_status_history for select
  using (auth.role() = 'authenticated');
-- (Rows are written by the SECURITY DEFINER log_status_change() trigger.)

-- ---- users: staff read only -----------------------------------------------
drop policy if exists "public read users"   on public.users;
drop policy if exists "public insert users" on public.users;
drop policy if exists "staff read users"    on public.users;
create policy "staff read users" on public.users for select
  using (auth.role() = 'authenticated');

-- ---- Public RPCs (SECURITY DEFINER — bypass RLS in controlled ways) --------

-- Submit a report anonymously. Only whitelisted columns are honoured;
-- id / tracking_id / status / created_at come from defaults + triggers.
create or replace function public.create_report(payload jsonb)
returns public.reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  rec public.reports;
begin
  insert into public.reports (
    category, severity, description_en, description_np, ward, municipality,
    location, latitude, longitude, reporter_name, contact, nibedan,
    english_letter, recommendation, image_url
  ) values (
    payload->>'category',
    payload->>'severity',
    payload->>'description_en',
    payload->>'description_np',
    payload->>'ward',
    payload->>'municipality',
    payload->>'location',
    nullif(payload->>'latitude','')::double precision,
    nullif(payload->>'longitude','')::double precision,
    payload->>'reporter_name',
    payload->>'contact',
    payload->>'nibedan',
    payload->>'english_letter',
    case when jsonb_typeof(payload->'recommendation') = 'object'
         then payload->'recommendation' else null end,
    payload->>'image_url'
  )
  returning * into rec;
  return rec;
end;
$$;

-- Look up ONE report by its tracking ID (the citizen's access token).
create or replace function public.get_report_by_tracking_id(p_tid text)
returns setof public.reports
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from public.reports where tracking_id ilike trim(p_tid) limit 1;
$$;

-- Status timeline for one report (report id is a non-guessable uuid).
create or replace function public.get_status_history(p_report_id uuid)
returns setof public.report_status_history
language sql
security definer
set search_path = public, pg_temp
as $$
  select * from public.report_status_history
  where report_id = p_report_id
  order by created_at asc;
$$;

-- Minimal, no-PII view of active reports, for the citizen duplicate check.
create or replace function public.list_active_reports_min()
returns table (
  id uuid, category text, ward text, status text,
  latitude double precision, longitude double precision,
  description_en text, created_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select id, category, ward, status, latitude, longitude, description_en, created_at
  from public.reports
  where status <> 'Resolved';
$$;

grant execute on function public.create_report(jsonb)            to anon, authenticated;
grant execute on function public.get_report_by_tracking_id(text) to anon, authenticated;
grant execute on function public.get_status_history(uuid)        to anon, authenticated;
grant execute on function public.list_active_reports_min()       to anon, authenticated;

-- ---- Harden tracking IDs: append a random, non-guessable token -------------
-- Because get_report_by_tracking_id() returns a full row to anyone with the ID,
-- the ID must not be enumerable. New reports become CMP-2026-0007-A3F9C1;
-- existing rows keep their old IDs. (Mirrors schema.sql.)
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

  tok := upper(substring(encode(gen_random_bytes(5), 'hex') from 1 for 6));

  return 'CMP-' || yr || '-' || lpad(nxt::text, 4, '0') || '-' || tok;
end;
$$;
