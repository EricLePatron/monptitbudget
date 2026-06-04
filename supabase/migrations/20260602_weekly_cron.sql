-- ============================================================
-- Weekly budget report — pg_cron + pg_net
-- Runs every Monday at 07:00 UTC (= 08:00 Paris hiver, 09:00 été)
-- ============================================================

-- Activate extensions (already enabled in most Supabase projects)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old schedule if it exists (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-budget-report');
EXCEPTION WHEN others THEN NULL;
END;
$$;

-- Schedule the Edge Function every Monday at 07:00 UTC
-- NOTE: Replace <ANON_KEY> with your VITE_SUPABASE_PUBLISHABLE_KEY value
SELECT cron.schedule(
  'weekly-budget-report',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://qqpmmehdowmsprkfhfle.supabase.co/functions/v1/weekly-budget-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcG1tZWhkb3dtc3Bya2ZoZmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NDg0OTYsImV4cCI6MjA4MjQyNDQ5Nn0.QdRleCAv0GDCsqStlt3kxizkngGaz5OP0F9C8zlcVGs"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
