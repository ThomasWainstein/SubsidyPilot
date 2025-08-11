-- Create extraction status enum with proper flow
CREATE TYPE extraction_status_enum AS ENUM (
  'uploading',
  'virus_scan', 
  'extracting',
  'ocr',
  'ai',
  'completed',
  'failed'
);

-- Add new columns to document_extractions
ALTER TABLE document_extractions 
ADD COLUMN status_v2 extraction_status_enum DEFAULT 'uploading',
ADD COLUMN last_event_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN failure_code TEXT,
ADD COLUMN failure_detail TEXT,
ADD COLUMN max_retries INTEGER DEFAULT 3,
ADD COLUMN current_retry INTEGER DEFAULT 0,
ADD COLUMN next_retry_at TIMESTAMPTZ,
ADD COLUMN progress_metadata JSONB DEFAULT '{}';

-- Enable realtime for document_extractions
ALTER TABLE document_extractions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE document_extractions;

-- Create index for efficient status queries
CREATE INDEX idx_document_extractions_status_v2 ON document_extractions(status_v2);
CREATE INDEX idx_document_extractions_last_event_at ON document_extractions(last_event_at);
CREATE INDEX idx_document_extractions_retry ON document_extractions(next_retry_at, current_retry) WHERE status_v2 = 'failed';

-- Create function to update status with automatic timestamp
CREATE OR REPLACE FUNCTION update_extraction_status(
  p_extraction_id UUID,
  p_status extraction_status_enum,
  p_failure_code TEXT DEFAULT NULL,
  p_failure_detail TEXT DEFAULT NULL,
  p_progress_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to increment retry count
CREATE OR REPLACE FUNCTION increment_retry_count(
  p_extraction_id UUID,
  p_backoff_seconds INTEGER DEFAULT 300
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add comments for documentation
COMMENT ON COLUMN document_extractions.status_v2 IS 'Current processing status with proper flow: uploading→virus_scan→extracting→ocr→ai→completed/failed';
COMMENT ON COLUMN document_extractions.last_event_at IS 'Timestamp of last status change for progress tracking';
COMMENT ON COLUMN document_extractions.failure_code IS 'Machine-readable error code for retry logic and user messaging';
COMMENT ON COLUMN document_extractions.failure_detail IS 'Human-readable error details for debugging';
COMMENT ON COLUMN document_extractions.progress_metadata IS 'Processing progress data: pages_processed, total_pages, etc.';