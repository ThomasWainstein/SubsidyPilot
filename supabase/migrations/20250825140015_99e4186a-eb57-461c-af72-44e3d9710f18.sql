-- Update polling schedule to start automation now
UPDATE polling_schedule 
SET 
  next_check = NOW() + INTERVAL '1 minute',
  last_check = NOW() - INTERVAL '1 hour'
WHERE api_source = 'les-aides-fr';

-- Ensure the scheduler is properly configured for comprehensive data collection
INSERT INTO polling_schedule (api_source, check_frequency, enabled, priority, max_failures) 
VALUES 
  ('les-aides-fr-comprehensive', 'every_6_hours', true, 1, 3)
ON CONFLICT (api_source) DO UPDATE SET
  check_frequency = 'every_6_hours',
  enabled = true,
  next_check = NOW() + INTERVAL '5 minutes';

-- Create a function to get comprehensive subsidy coverage
CREATE OR REPLACE FUNCTION trigger_comprehensive_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Trigger comprehensive sync for all 2025 subsidies
  SELECT net.http_post(
    url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/sync-les-aides-optimal',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI"}'::jsonb,
    body := ('{"sync_type": "comprehensive", "max_pages": 100, "target_year": 2025}')::jsonb
  );
END;
$$;