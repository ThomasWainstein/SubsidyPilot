-- Fix security warnings by adding search_path to functions
DROP FUNCTION update_extraction_status(UUID, extraction_status_enum, TEXT, TEXT, JSONB);
DROP FUNCTION increment_retry_count(UUID, INTEGER);

-- Recreate functions with proper search_path
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
BEGIN
  UPDATE document_extractions 
  SET 
    status_v2 = p_status,
    last_event_at = now(),
    failure_code = p_failure_code,
    failure_detail = p_failure_detail,
    progress_metadata = COALESCE(progress_metadata, '{}') || p_progress_metadata,
    updated_at = now()
  WHERE id = p_extraction_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to increment retry count with proper search_path
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
BEGIN
  SELECT current_retry, max_retries 
  INTO current_retries, max_retries_allowed
  FROM document_extractions 
  WHERE id = p_extraction_id;
  
  IF current_retries >= max_retries_allowed THEN
    RETURN FALSE;
  END IF;
  
  UPDATE document_extractions 
  SET 
    current_retry = current_retry + 1,
    next_retry_at = now() + (p_backoff_seconds || ' seconds')::INTERVAL,
    status_v2 = 'failed',
    last_event_at = now()
  WHERE id = p_extraction_id;
  
  RETURN FOUND;
END;
$$;