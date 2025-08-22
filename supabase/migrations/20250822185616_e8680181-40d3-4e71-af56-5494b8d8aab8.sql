-- Fix the security issue with the validate_document_reference function
-- The linter detected that the search_path parameter is not set for security

-- Drop and recreate the function with proper security settings
DROP FUNCTION IF EXISTS validate_document_reference();

CREATE OR REPLACE FUNCTION validate_document_reference()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If source_table is farm_documents, check farm_documents table
  IF NEW.source_table = 'farm_documents' THEN
    IF NOT EXISTS (SELECT 1 FROM farm_documents WHERE id = NEW.document_id) THEN
      RAISE EXCEPTION 'Document % not found in farm_documents', NEW.document_id;
    END IF;
  -- If source_table is client_documents, check client_documents table
  ELSIF NEW.source_table = 'client_documents' THEN
    IF NOT EXISTS (SELECT 1 FROM client_documents WHERE id = NEW.document_id) THEN
      RAISE EXCEPTION 'Document % not found in client_documents', NEW.document_id;
    END IF;
  -- If source_table is universal, allow any document_id (for processing jobs)
  ELSIF NEW.source_table = 'universal' THEN
    -- No validation needed for universal documents
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;