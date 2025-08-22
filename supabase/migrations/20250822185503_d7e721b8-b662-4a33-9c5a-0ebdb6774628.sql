-- Fix foreign key constraint for universal client documents
-- Remove the strict foreign key constraint that requires documents to be in farm_documents
-- since we now have universal client documents that may not be farm-related

-- First, check if there's a foreign key constraint on document_extractions.document_id
-- If so, we need to modify it to be more flexible

-- Drop the existing constraint if it exists
ALTER TABLE document_extractions DROP CONSTRAINT IF EXISTS fk_document_extractions_document_id;

-- Create a more flexible approach by creating a client_documents table for universal documents
CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  processing_status TEXT NOT NULL DEFAULT 'upload_pending',
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for client_documents
CREATE POLICY "Users can view their own client documents" 
ON client_documents FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own client documents" 
ON client_documents FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own client documents" 
ON client_documents FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all client documents" 
ON client_documents FOR ALL 
USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_client_documents_updated_at
  BEFORE UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- Now we need to modify document_extractions to handle both farm_documents and client_documents
-- Add a source_table column to track where the document comes from
ALTER TABLE document_extractions 
ADD COLUMN IF NOT EXISTS source_table TEXT DEFAULT 'farm_documents';

-- Add a check constraint to ensure valid source tables
ALTER TABLE document_extractions 
ADD CONSTRAINT valid_source_table 
CHECK (source_table IN ('farm_documents', 'client_documents', 'universal'));

-- Create a function to validate document existence across tables
CREATE OR REPLACE FUNCTION validate_document_reference()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to validate document references
DROP TRIGGER IF EXISTS validate_document_reference_trigger ON document_extractions;
CREATE TRIGGER validate_document_reference_trigger
  BEFORE INSERT OR UPDATE ON document_extractions
  FOR EACH ROW
  EXECUTE FUNCTION validate_document_reference();