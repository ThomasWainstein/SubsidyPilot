-- Fix polling_schedule table and activate automated 2025 subsidy collection
ALTER TABLE polling_schedule ADD CONSTRAINT polling_schedule_api_source_unique UNIQUE (api_source);

-- Update existing schedule to start comprehensive collection NOW
UPDATE polling_schedule 
SET 
  next_check = NOW(),
  last_check = NOW() - INTERVAL '2 hours',
  enabled = true,
  check_frequency = 'every_2_hours'
WHERE api_source = 'les-aides-fr';

-- Create comprehensive collection schedule for 2025 subsidies
INSERT INTO polling_schedule (api_source, check_frequency, enabled, priority, max_failures, next_check) 
VALUES ('les-aides-fr-2025-collection', 'every_4_hours', true, 1, 3, NOW() + INTERVAL '5 minutes')
ON CONFLICT (api_source) DO UPDATE SET
  check_frequency = 'every_4_hours',
  enabled = true,
  next_check = NOW() + INTERVAL '5 minutes',
  failure_count = 0;

-- Schedule comprehensive 2025 collection cron job
SELECT cron.schedule(
  'les-aides-2025-comprehensive',
  '0 */4 * * *', -- Every 4 hours
  $$
  SELECT net.http_post(
    url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/sync-les-aides-optimal',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI"}'::jsonb,
    body := '{"sync_type": "comprehensive_2025", "max_pages": 50, "target_year": 2025}'::jsonb
  ) as request_id;
  $$
);

-- Create function to trigger immediate comprehensive sync
CREATE OR REPLACE FUNCTION trigger_2025_collection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Trigger comprehensive sync immediately
  SELECT net.http_post(
    url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/sync-les-aides-optimal',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI"}'::jsonb,
    body := '{"sync_type": "comprehensive_2025", "max_pages": 100, "target_year": 2025, "immediate": true}'::jsonb
  ) INTO result;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Comprehensive 2025 subsidy collection initiated',
    'http_response', result,
    'schedule_active', true
  );
END;
$$;