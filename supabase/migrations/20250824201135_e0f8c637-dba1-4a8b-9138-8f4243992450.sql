-- Phase 1: Database Configuration Fixes
-- Fix cron job frequency from 30 minutes to 2 minutes and ensure realtime is properly configured

-- First, remove the existing cron job if it exists
SELECT cron.unschedule('streaming-job-processor-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'streaming-job-processor-hourly'
);

-- Create new frequent cron job (every 2 minutes)  
SELECT cron.schedule(
  'streaming-job-processor-frequent',
  '*/2 * * * *', -- Every 2 minutes
  $$
  SELECT net.http_post(
    url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/streaming-job-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwODE3MywiZXhwIjoyMDY0Mjg0MTczfQ.g1k0y5f4P6gKrg0r1p5FnOJWRW5CiZG1JU_KrCw0rXo'
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'timestamp', now()::text,
      'priority', 'high'
    )
  ) as request_id;
  $$
);

-- Ensure realtime is properly enabled on critical tables
ALTER TABLE document_processing_jobs REPLICA IDENTITY FULL;
ALTER TABLE document_extractions REPLICA IDENTITY FULL;

-- Add tables to realtime publication if not already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE document_processing_jobs;
  EXCEPTION 
    WHEN duplicate_object THEN 
      NULL; -- Table already in publication
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE document_extractions;
  EXCEPTION 
    WHEN duplicate_object THEN 
      NULL; -- Table already in publication
  END;
END
$$;

-- Add function to trigger immediate processing from database level
CREATE OR REPLACE FUNCTION trigger_immediate_processing()
RETURNS trigger AS $$
BEGIN
  -- Only trigger for newly created jobs in 'queued' status
  IF NEW.status = 'queued' AND (OLD.status IS NULL OR OLD.status != 'queued') THEN
    -- Make async HTTP call to trigger processing immediately
    PERFORM net.http_post(
      url := 'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/streaming-job-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwODE3MywiZXhwIjoyMDY0Mjg0MTczfQ.g1k0y5f4P6gKrg0r1p5FnOJWRW5CiZG1JU_KrCw0rXo'
      ),
      body := jsonb_build_object(
        'trigger', 'immediate',
        'jobId', NEW.id::text,
        'priority', 'high'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for immediate processing on job creation
DROP TRIGGER IF EXISTS trigger_immediate_job_processing ON document_processing_jobs;
CREATE TRIGGER trigger_immediate_job_processing
  AFTER INSERT OR UPDATE ON document_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_immediate_processing();