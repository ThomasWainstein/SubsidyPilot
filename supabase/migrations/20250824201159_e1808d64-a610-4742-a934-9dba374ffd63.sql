-- Fix security warning: Set search_path for the trigger function
CREATE OR REPLACE FUNCTION trigger_immediate_processing()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;