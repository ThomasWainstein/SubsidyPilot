-- Create scrape runs tracking table
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notes TEXT,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add run tracking and metrics columns to existing tables
ALTER TABLE document_extractions 
  ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES scrape_runs(id),
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS error_type TEXT,
  ADD COLUMN IF NOT EXISTS ocr_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pages_processed INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS model_used TEXT;

ALTER TABLE subsidies_structured 
  ADD COLUMN IF NOT EXISTS run_id UUID REFERENCES scrape_runs(id),
  ADD COLUMN IF NOT EXISTS source_slug TEXT,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS checksum TEXT;

-- Create crawl events table for tracking page crawling
CREATE TABLE IF NOT EXISTS crawl_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES scrape_runs(id),
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms INTEGER,
  checksum TEXT,
  error_message TEXT,
  pages_found INTEGER DEFAULT 0,
  documents_found INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create extraction queue table for managing processing
CREATE TABLE IF NOT EXISTS extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES scrape_runs(id),
  document_url TEXT NOT NULL,
  document_type TEXT,
  priority INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create KPI calculation function
CREATE OR REPLACE FUNCTION scrape_run_kpis(p_run_id UUID)
RETURNS TABLE(
  docs_total INTEGER, 
  docs_ok INTEGER, 
  docs_fail INTEGER,
  docs_pending INTEGER,
  ocr_rate NUMERIC, 
  avg_latency NUMERIC,
  subsidies_parsed INTEGER, 
  pages_crawled INTEGER,
  error_rate NUMERIC,
  completion_rate NUMERIC
) 
LANGUAGE SQL AS $$
  WITH d AS (
    SELECT * FROM document_extractions WHERE run_id = p_run_id
  ), s AS (
    SELECT count(*) as subsidies_parsed FROM subsidies_structured WHERE run_id = p_run_id
  ), c AS (
    SELECT count(*) as pages_crawled FROM crawl_events WHERE run_id = p_run_id
  ), q AS (
    SELECT count(*) as total_queued FROM extraction_queue WHERE run_id = p_run_id
  )
  SELECT
    COALESCE((SELECT count(*)::INTEGER FROM d), 0) as docs_total,
    COALESCE((SELECT count(*)::INTEGER FROM d WHERE status='completed'), 0) as docs_ok,
    COALESCE((SELECT count(*)::INTEGER FROM d WHERE status='failed'), 0) as docs_fail,
    COALESCE((SELECT count(*)::INTEGER FROM extraction_queue WHERE run_id = p_run_id AND status = 'pending'), 0) as docs_pending,
    COALESCE((SELECT (count(*) FILTER (WHERE ocr_used = true))::NUMERIC / NULLIF(count(*), 0) FROM d), 0) as ocr_rate,
    COALESCE((SELECT avg(latency_ms)::NUMERIC FROM d WHERE latency_ms IS NOT NULL), 0) as avg_latency,
    s.subsidies_parsed::INTEGER, 
    c.pages_crawled::INTEGER,
    COALESCE((SELECT count(*)::NUMERIC / NULLIF(count(*), 0) FROM d WHERE status = 'failed'), 0) as error_rate,
    COALESCE((SELECT count(*)::NUMERIC / NULLIF((SELECT total_queued FROM q), 0) FROM d), 0) as completion_rate
  FROM s, c;
$$;

-- Create function to archive previous data
CREATE OR REPLACE FUNCTION archive_previous_data()
RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  new_run_id UUID;
BEGIN
  -- Create new run
  INSERT INTO scrape_runs (notes, status) 
  VALUES ('Full re-scrape and reprocessing', 'running') 
  RETURNING id INTO new_run_id;
  
  -- Archive current subsidies_structured data
  UPDATE subsidies_structured 
  SET archived = true 
  WHERE archived = false OR archived IS NULL;
  
  RETURN new_run_id;
END;
$$;

-- Create function to rollback to previous version
CREATE OR REPLACE FUNCTION rollback_to_previous(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
BEGIN
  -- Hide current run data
  UPDATE subsidies_structured 
  SET archived = true 
  WHERE run_id = p_run_id;
  
  -- Restore previous version (most recent archived data)
  UPDATE subsidies_structured 
  SET archived = false 
  WHERE id IN (
    SELECT DISTINCT ON (url) id 
    FROM subsidies_structured 
    WHERE archived = true AND (run_id != p_run_id OR run_id IS NULL)
    ORDER BY url, created_at DESC
  );
  
  -- Mark run as rolled back
  UPDATE scrape_runs 
  SET status = 'rolled_back', completed_at = now()
  WHERE id = p_run_id;
  
  RETURN true;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_extractions_run_id ON document_extractions(run_id);
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_run_id ON subsidies_structured(run_id);
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_archived ON subsidies_structured(archived);
CREATE INDEX IF NOT EXISTS idx_crawl_events_run_id ON crawl_events(run_id);
CREATE INDEX IF NOT EXISTS idx_extraction_queue_run_id ON extraction_queue(run_id);
CREATE INDEX IF NOT EXISTS idx_extraction_queue_status ON extraction_queue(status);

-- Enable RLS policies
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view scrape runs" 
ON scrape_runs FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage scrape runs" 
ON scrape_runs FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view crawl events" 
ON crawl_events FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage crawl events" 
ON crawl_events FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view extraction queue" 
ON extraction_queue FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage extraction queue" 
ON extraction_queue FOR ALL 
USING (auth.role() = 'service_role');