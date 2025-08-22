-- Create a cron job to process streaming jobs every 30 seconds
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('process-streaming-jobs');

-- Schedule the streaming job processor to run every 30 seconds
SELECT cron.schedule(
  'process-streaming-jobs',
  '*/30 * * * * *', -- Every 30 seconds
  $$
  SELECT net.http_post(
    url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/streaming-job-processor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI"}'::jsonb,
    body := '{"trigger": "cron", "timestamp": "' || now() || '"}'::jsonb
  ) as request_id;
  $$
);

-- Add cleanup job for old completed jobs (run every hour)
SELECT cron.schedule(
  'cleanup-old-streaming-jobs',
  '0 * * * *', -- Every hour
  $$
  DELETE FROM document_processing_jobs 
  WHERE status IN ('completed', 'failed') 
  AND created_at < NOW() - INTERVAL '24 hours';
  $$
);

-- Add heartbeat monitoring for stuck jobs (run every 5 minutes)  
SELECT cron.schedule(
  'monitor-stuck-streaming-jobs',
  '*/5 * * * *', -- Every 5 minutes
  $$
  UPDATE document_processing_jobs 
  SET status = 'failed', 
      error_message = 'Job timeout - no heartbeat for 10 minutes',
      updated_at = NOW()
  WHERE status = 'processing' 
  AND (metadata->>'last_heartbeat')::timestamp < NOW() - INTERVAL '10 minutes';
  $$
);