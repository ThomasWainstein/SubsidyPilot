-- Phase A: Enhanced document storage and extraction tracking
-- Add comprehensive metadata to farm_documents
ALTER TABLE farm_documents 
ADD COLUMN IF NOT EXISTS file_hash text,
ADD COLUMN IF NOT EXISTS page_count integer,
ADD COLUMN IF NOT EXISTS language_detected text,
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_details jsonb;

-- Create index for hash-based deduplication
CREATE INDEX IF NOT EXISTS idx_farm_documents_hash ON farm_documents(file_hash) WHERE file_hash IS NOT NULL;

-- Enhance document_extractions with chunking and detailed tracking
ALTER TABLE document_extractions
ADD COLUMN IF NOT EXISTS text_chunks jsonb,
ADD COLUMN IF NOT EXISTS chunk_count integer,
ADD COLUMN IF NOT EXISTS ocr_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS processing_time_ms integer,
ADD COLUMN IF NOT EXISTS model_version text,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Create index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_extractions_idempotency 
ON document_extractions(document_id, idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Create extraction_metrics table for observability
CREATE TABLE IF NOT EXISTS extraction_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES farm_documents(id),
  operation_type text NOT NULL, -- 'text_extraction', 'ocr', 'ai_processing'
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  duration_ms integer,
  success boolean,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for metrics queries
CREATE INDEX IF NOT EXISTS idx_extraction_metrics_document ON extraction_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_extraction_metrics_type_time ON extraction_metrics(operation_type, start_time);

-- Add RLS policies for new tables
ALTER TABLE extraction_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for their documents" 
ON extraction_metrics FOR SELECT 
TO public 
USING (
  EXISTS (
    SELECT 1 FROM farm_documents fd 
    JOIN farms f ON f.id = fd.farm_id 
    WHERE fd.id = document_id AND f.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Service role can manage extraction metrics" 
ON extraction_metrics FOR ALL 
TO public 
USING ((SELECT auth.role()) = 'service_role') 
WITH CHECK ((SELECT auth.role()) = 'service_role');