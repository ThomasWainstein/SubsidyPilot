-- Create a function to trigger auto schema extraction
CREATE OR REPLACE FUNCTION trigger_auto_schema_extraction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for new subsidies (INSERT) or when URL changes significantly (UPDATE)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.url != NEW.url) THEN
    -- Make an async call to the auto-schema-extraction edge function
    -- We use pg_net extension if available, otherwise we'll trigger manually
    PERFORM net.http_post(
      'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/auto-schema-extraction',
      jsonb_build_object('subsidyId', NEW.id::text),
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
      'auto_schema_extraction_trigger',
      SQLERRM,
      jsonb_build_object(
        'subsidy_id', NEW.id,
        'trigger_op', TG_OP,
        'timestamp', now()
      )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on subsidies_structured table for automatic schema extraction
DROP TRIGGER IF EXISTS auto_schema_extraction_trigger ON subsidies_structured;
CREATE TRIGGER auto_schema_extraction_trigger
  AFTER INSERT OR UPDATE OF url ON subsidies_structured
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_schema_extraction();

-- Create an index to improve performance of extraction status queries
CREATE INDEX IF NOT EXISTS idx_document_extraction_status_subsidy_status 
ON document_extraction_status(subsidy_id, extraction_status);

-- Create an index for faster lookup of subsidies needing extraction
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_id_url 
ON subsidies_structured(id, url) WHERE url IS NOT NULL;

COMMENT ON FUNCTION trigger_auto_schema_extraction() IS 'Automatically triggers schema extraction when new subsidies are added or URLs change';
COMMENT ON TRIGGER auto_schema_extraction_trigger ON subsidies_structured IS 'Triggers automatic document schema extraction for new subsidies';