-- =========================================
-- CRITICAL FIX #1: ENABLE PG_NET EXTENSION
-- Resolves 43 active errors blocking auto-extraction
-- =========================================

-- Enable pg_net extension for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions for functions to use pg_net
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA net TO postgres, anon, authenticated, service_role;

-- =========================================
-- CRITICAL FIX #2: QA INTEGRATION SETUP
-- Wire QA framework into production pipeline
-- =========================================

-- Create function to trigger QA validation after extraction
CREATE OR REPLACE FUNCTION public.trigger_qa_validation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger QA for completed extractions
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Make async call to QA validation function
    PERFORM net.http_post(
      'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/pipeline-qa-validator',
      jsonb_build_object(
        'extractedData', NEW.extracted_data,
        'documentId', NEW.document_id::text,
        'extractionId', NEW.id::text,
        'sourceUrl', COALESCE(
          (SELECT source_url FROM farm_documents WHERE id = NEW.document_id),
          'unknown'
        )
      ),
      'application/json',
      jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
        'Content-Type', 'application/json'
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    INSERT INTO error_log (error_type, error_message, metadata)
    VALUES (
      'qa_validation_trigger',
      SQLERRM,
      jsonb_build_object(
        'extraction_id', NEW.id,
        'document_id', NEW.document_id,
        'timestamp', now()
      )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add QA trigger to document extractions
CREATE TRIGGER trigger_qa_after_extraction
    AFTER INSERT OR UPDATE OF status ON public.document_extractions
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_qa_validation();

-- =========================================
-- CRITICAL FIX #3: USER ACTION CORRELATION
-- Add user tracking to all pipeline operations
-- =========================================

-- Add user correlation fields to pipeline_executions
ALTER TABLE public.pipeline_executions 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS triggered_by TEXT DEFAULT 'system';

-- Add user correlation fields to document_extractions (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'document_extractions' AND column_name = 'triggered_by') THEN
    ALTER TABLE public.document_extractions ADD COLUMN triggered_by TEXT DEFAULT 'system';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'document_extractions' AND column_name = 'session_id') THEN
    ALTER TABLE public.document_extractions ADD COLUMN session_id TEXT;
  END IF;
END $$;