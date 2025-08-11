-- B) API & DB Hardening - Create idempotent RPCs with proper guards

-- Drop existing functions to recreate with better guards
DROP FUNCTION IF EXISTS update_extraction_status(UUID, extraction_status_enum, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS increment_retry_count(UUID, INTEGER);

-- Enhanced update_extraction_status with NULL extraction handling
CREATE OR REPLACE FUNCTION update_extraction_status(
  p_extraction_id UUID,
  p_status extraction_status_enum,
  p_failure_code TEXT DEFAULT NULL,
  p_failure_detail TEXT DEFAULT NULL,
  p_progress_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  extraction_exists BOOLEAN;
BEGIN
  -- Check if extraction exists
  SELECT EXISTS(SELECT 1 FROM document_extractions WHERE id = p_extraction_id) 
  INTO extraction_exists;
  
  IF NOT extraction_exists THEN
    RAISE WARNING 'Extraction % does not exist', p_extraction_id;
    RETURN FALSE;
  END IF;
  
  -- Update extraction with proper metadata merging
  UPDATE document_extractions 
  SET 
    status_v2 = p_status,
    last_event_at = now(),
    failure_code = CASE WHEN p_status = 'failed' THEN p_failure_code ELSE NULL END,
    failure_detail = CASE WHEN p_status = 'failed' THEN p_failure_detail ELSE NULL END,
    progress_metadata = COALESCE(progress_metadata, '{}') || COALESCE(p_progress_metadata, '{}'),
    updated_at = now()
  WHERE id = p_extraction_id;
  
  RETURN FOUND;
END;
$$;

-- Enhanced increment_retry_count with better backoff and guards
CREATE OR REPLACE FUNCTION increment_retry_count(
  p_extraction_id UUID,
  p_backoff_seconds INTEGER DEFAULT 300
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_retries INTEGER;
  max_retries_allowed INTEGER;
  extraction_exists BOOLEAN;
BEGIN
  -- Check if extraction exists and get retry info
  SELECT 
    EXISTS(SELECT 1 FROM document_extractions WHERE id = p_extraction_id),
    COALESCE(current_retry, 0),
    COALESCE(max_retries, 3)
  INTO extraction_exists, current_retries, max_retries_allowed
  FROM document_extractions 
  WHERE id = p_extraction_id;
  
  IF NOT extraction_exists THEN
    RAISE WARNING 'Extraction % does not exist for retry increment', p_extraction_id;
    RETURN FALSE;
  END IF;
  
  -- Check retry limit
  IF current_retries >= max_retries_allowed THEN
    RAISE WARNING 'Maximum retries % exceeded for extraction %', max_retries_allowed, p_extraction_id;
    RETURN FALSE;
  END IF;
  
  -- Increment retry with exponential backoff + jitter
  UPDATE document_extractions 
  SET 
    current_retry = current_retry + 1,
    next_retry_at = now() + (p_backoff_seconds + (random() * 30))::text || ' seconds'::INTERVAL,
    last_event_at = now(),
    updated_at = now()
  WHERE id = p_extraction_id;
  
  RETURN FOUND;
END;
$$;

-- Create trigger for automatic last_event_at updates
CREATE OR REPLACE FUNCTION trigger_update_last_event_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Only update last_event_at if status_v2 changed
  IF OLD.status_v2 IS DISTINCT FROM NEW.status_v2 THEN
    NEW.last_event_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to document_extractions
DROP TRIGGER IF EXISTS update_last_event_at_trigger ON document_extractions;
CREATE TRIGGER update_last_event_at_trigger
  BEFORE UPDATE ON document_extractions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_last_event_at();

-- Ensure realtime is properly configured (idempotent)
DO $$
BEGIN
  -- Enable realtime only if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'document_extractions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE document_extractions;
  END IF;
END $$;

-- Create helper function for creating new extraction with idempotency
CREATE OR REPLACE FUNCTION create_extraction_if_not_exists(
  p_document_id UUID,
  p_idempotency_key TEXT,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  extraction_id UUID;
BEGIN
  -- Try to find existing extraction by idempotency key
  SELECT id INTO extraction_id
  FROM document_extractions
  WHERE idempotency_key = p_idempotency_key
  AND document_id = p_document_id;
  
  -- If not found, create new extraction
  IF extraction_id IS NULL THEN
    INSERT INTO document_extractions (
      document_id,
      user_id,
      status_v2,
      idempotency_key,
      extracted_data,
      confidence_score,
      max_retries,
      current_retry
    ) VALUES (
      p_document_id,
      p_user_id,
      'uploading',
      p_idempotency_key,
      '{}',
      0.0,
      3,
      0
    ) RETURNING id INTO extraction_id;
  END IF;
  
  RETURN extraction_id;
END;
$$;

-- Add environment configuration table
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default config values (idempotent)
INSERT INTO system_config (key, value, description) VALUES
  ('MAX_RETRIES', '3', 'Maximum number of retry attempts for failed extractions'),
  ('BASE_BACKOFF_SECONDS', '300', 'Base backoff delay in seconds (5 minutes)'),
  ('MAX_BACKOFF_SECONDS', '3600', 'Maximum backoff delay in seconds (1 hour)'),
  ('ENABLE_REALTIME_STATUS', 'true', 'Enable realtime status updates'),
  ('ENABLE_METRICS_PANEL', 'true', 'Show detailed performance metrics')
ON CONFLICT (key) DO NOTHING;

-- Add RLS to system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System config readable by authenticated users" 
ON system_config FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "System config manageable by service role" 
ON system_config FOR ALL 
TO service_role
USING (true);