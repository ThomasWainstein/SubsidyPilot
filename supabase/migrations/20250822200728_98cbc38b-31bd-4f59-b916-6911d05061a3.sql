-- Fix the cron job with proper JSON formatting
SELECT cron.unschedule('process-streaming-jobs');

-- Reschedule with corrected JSON body
SELECT cron.schedule(
  'process-streaming-jobs',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/streaming-job-processor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI"}'::jsonb,
    body := jsonb_build_object('trigger', 'cron', 'timestamp', now()::text)
  ) as request_id;
  $$
);