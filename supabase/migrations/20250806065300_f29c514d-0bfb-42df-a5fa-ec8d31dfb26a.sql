-- Enhanced database schema for verbatim content extraction and document processing

-- Update subsidies_structured table to store verbatim French content
ALTER TABLE subsidies_structured 
ADD COLUMN IF NOT EXISTS presentation TEXT,
ADD COLUMN IF NOT EXISTS application_process TEXT,
ADD COLUMN IF NOT EXISTS deadlines TEXT,
ADD COLUMN IF NOT EXISTS amounts TEXT,
ADD COLUMN IF NOT EXISTS extracted_documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS document_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verbatim_extraction BOOLEAN DEFAULT FALSE;

-- Create application_forms table for storing extracted form schemas
CREATE TABLE IF NOT EXISTS application_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subsidy_id UUID REFERENCES subsidies_structured(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  form_title TEXT,
  form_description TEXT,
  form_fields JSONB DEFAULT '[]',
  application_steps JSONB DEFAULT '[]',
  required_documents JSONB DEFAULT '[]',
  deadlines TEXT,
  contact_info TEXT,
  document_type TEXT,
  confidence_score NUMERIC DEFAULT 0.7,
  extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  pipeline_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_application_forms_subsidy_id ON application_forms(subsidy_id);
CREATE INDEX IF NOT EXISTS idx_application_forms_document_type ON application_forms(document_type);
CREATE INDEX IF NOT EXISTS idx_application_forms_pipeline_id ON application_forms(pipeline_id);

-- Enable RLS for application_forms
ALTER TABLE application_forms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for application_forms
CREATE POLICY "Service role can manage application forms" 
ON application_forms FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view application forms" 
ON application_forms FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at column
CREATE TRIGGER update_application_forms_updated_at
BEFORE UPDATE ON application_forms
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes on subsidies_structured for new columns
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_document_count ON subsidies_structured(document_count);
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_verbatim ON subsidies_structured(verbatim_extraction);

-- Add GIN index for document search
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_documents ON subsidies_structured USING GIN (extracted_documents);

-- Create function to update document count automatically
CREATE OR REPLACE FUNCTION update_document_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.document_count = COALESCE(jsonb_array_length(NEW.extracted_documents), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update document count
DROP TRIGGER IF EXISTS trigger_update_document_count ON subsidies_structured;
CREATE TRIGGER trigger_update_document_count
  BEFORE INSERT OR UPDATE OF extracted_documents ON subsidies_structured
  FOR EACH ROW
  EXECUTE FUNCTION update_document_count();