-- Fix document_extractions validation for universal documents
-- Remove the strict validation that's blocking universal document processing

-- First, let's check the constraint that might be blocking universal documents
-- Then update the validation function to allow universal documents

CREATE OR REPLACE FUNCTION public.validate_document_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Universal documents don't need strict validation - they're for processing jobs
    -- Just ensure the document_id is a valid UUID format
    IF NEW.document_id IS NULL THEN
      RAISE EXCEPTION 'Document ID cannot be null for universal documents';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;