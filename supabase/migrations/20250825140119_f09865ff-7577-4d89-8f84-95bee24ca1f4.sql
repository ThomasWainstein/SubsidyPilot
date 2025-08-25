-- Fix the security issue with function search_path
CREATE OR REPLACE FUNCTION trigger_2025_collection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Trigger comprehensive sync immediately
  SELECT net.http_post(
    url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/sync-les-aides-optimal',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZql5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI"}'::jsonb,
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