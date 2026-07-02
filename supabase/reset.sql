-- ============================================================================
-- Hamro Ward — reset demo data
-- Run in the Supabase SQL Editor to wipe all reports and restart tracking IDs
-- from CMP-<year>-0001. Does NOT touch the schema (tables/triggers stay).
-- ============================================================================

truncate public.reports cascade;        -- also clears report_status_history (FK cascade)
delete from public.report_counters;      -- next tracking ID restarts at 0001
