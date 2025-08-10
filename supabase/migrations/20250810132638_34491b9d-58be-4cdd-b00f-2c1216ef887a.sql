-- Sprint 1: Complex Table Extraction
-- Add table extraction fields to document_extractions
ALTER TABLE document_extractions 
ADD COLUMN IF NOT EXISTS tables_extracted jsonb,
ADD COLUMN IF NOT EXISTS table_parser text,
ADD COLUMN IF NOT EXISTS table_quality numeric;

-- Add index for table quality queries
CREATE INDEX IF NOT EXISTS idx_docextr_tableq ON document_extractions(table_quality);

-- Sprint 2: Per-Source Parsing Templates
-- Create parsing profiles table
CREATE TABLE IF NOT EXISTS parsing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  active boolean DEFAULT true,
  prompt jsonb DEFAULT '{}',
  regex jsonb DEFAULT '{}',
  table_hints jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_slug, version)
);

-- Add source template tracking to extractions
ALTER TABLE document_extractions
ADD COLUMN IF NOT EXISTS source_template_version text;

-- Sprint 3: Human Review UI
-- Create document extraction reviews table  
CREATE TABLE IF NOT EXISTS document_extraction_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id uuid NOT NULL REFERENCES document_extractions(id),
  assigned_to uuid,
  status text CHECK (status IN ('pending','in_review','approved','rejected')) DEFAULT 'pending',
  changes jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_extraction ON document_extraction_reviews(extraction_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON document_extraction_reviews(status);

-- Sprint 4: Batch Processing
-- Add batch support to extraction queue
ALTER TABLE extraction_queue
ADD COLUMN IF NOT EXISTS batch_id uuid,
ADD COLUMN IF NOT EXISTS batch_label text;

CREATE TABLE IF NOT EXISTS extraction_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  label text,
  total_count integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text DEFAULT 'processing',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Sprint 5: Multi-Language
-- Add language detection fields
ALTER TABLE document_extractions
ADD COLUMN IF NOT EXISTS detected_language text,
ADD COLUMN IF NOT EXISTS translated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS translation_confidence numeric;

CREATE INDEX IF NOT EXISTS idx_docextr_lang ON document_extractions(detected_language);

-- Sprint 7: Incremental Scraping
-- Add checksum and caching to subsidies
ALTER TABLE subsidies_structured
ADD COLUMN IF NOT EXISTS content_checksum text,
ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_subsidies_checksum ON subsidies_structured(content_checksum);

-- Sprint 6: Quality Dashboard View
CREATE OR REPLACE VIEW v_extraction_quality AS
SELECT
  date_trunc('day', created_at) AS day,
  count(*) AS docs_total,
  avg(CASE WHEN status='completed' THEN 1 ELSE 0 END)::numeric AS completion_rate,
  avg(COALESCE(latency_ms,0)) AS avg_latency,
  avg(CASE WHEN ocr_used THEN 1 ELSE 0 END)::numeric AS ocr_rate,
  avg(COALESCE(confidence_score,0)) AS avg_confidence,
  avg(COALESCE(table_quality,0)) AS avg_table_quality
FROM document_extractions
WHERE created_at >= current_date - interval '30 days'
GROUP BY 1
ORDER BY 1 DESC;