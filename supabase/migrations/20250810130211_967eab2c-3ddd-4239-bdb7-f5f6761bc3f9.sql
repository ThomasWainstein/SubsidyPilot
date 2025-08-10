-- Fix security warnings by setting search_path for functions
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
LANGUAGE SQL 
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION archive_previous_data()
RETURNS UUID
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION rollback_to_previous(p_run_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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