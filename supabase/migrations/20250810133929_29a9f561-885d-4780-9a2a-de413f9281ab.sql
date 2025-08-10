-- Fix remaining database security issues from linter

-- Fix all remaining functions without search_path
CREATE OR REPLACE FUNCTION public.scrape_run_kpis(p_run_id uuid)
RETURNS TABLE(docs_total integer, docs_ok integer, docs_fail integer, docs_pending integer, ocr_rate numeric, avg_latency numeric, subsidies_parsed integer, pages_crawled integer, error_rate numeric, completion_rate numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT * FROM public.document_extractions WHERE run_id = p_run_id
  ), s AS (
    SELECT count(*) as subsidies_parsed FROM public.subsidies_structured WHERE run_id = p_run_id
  ), c AS (
    SELECT count(*) as pages_crawled FROM public.crawl_events WHERE run_id = p_run_id
  ), q AS (
    SELECT count(*) as total_queued FROM public.extraction_queue WHERE run_id = p_run_id
  )
  SELECT
    COALESCE((SELECT count(*)::INTEGER FROM d), 0) as docs_total,
    COALESCE((SELECT count(*)::INTEGER FROM d WHERE status='completed'), 0) as docs_ok,
    COALESCE((SELECT count(*)::INTEGER FROM d WHERE status='failed'), 0) as docs_fail,
    COALESCE((SELECT count(*)::INTEGER FROM public.extraction_queue WHERE run_id = p_run_id AND status = 'pending'), 0) as docs_pending,
    COALESCE((SELECT (count(*) FILTER (WHERE ocr_used = true))::NUMERIC / NULLIF(count(*), 0) FROM d), 0) as ocr_rate,
    COALESCE((SELECT avg(latency_ms)::NUMERIC FROM d WHERE latency_ms IS NOT NULL), 0) as avg_latency,
    s.subsidies_parsed::INTEGER, 
    c.pages_crawled::INTEGER,
    COALESCE((SELECT count(*)::NUMERIC / NULLIF(count(*), 0) FROM d WHERE status = 'failed'), 0) as error_rate,
    COALESCE((SELECT count(*)::NUMERIC / NULLIF((SELECT total_queued FROM q), 0) FROM d), 0) as completion_rate
  FROM s, c;
$$;

CREATE OR REPLACE FUNCTION public.archive_previous_data()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_run_id UUID;
BEGIN
  -- Create new run
  INSERT INTO public.scrape_runs (notes, status) 
  VALUES ('Full re-scrape and reprocessing', 'running') 
  RETURNING id INTO new_run_id;
  
  -- Archive current subsidies_structured data
  UPDATE public.subsidies_structured 
  SET archived = true 
  WHERE archived = false OR archived IS NULL;
  
  RETURN new_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rollback_to_previous(p_run_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hide current run data
  UPDATE public.subsidies_structured 
  SET archived = true 
  WHERE run_id = p_run_id;
  
  -- Restore previous version (most recent archived data)
  UPDATE public.subsidies_structured 
  SET archived = false 
  WHERE id IN (
    SELECT DISTINCT ON (url) id 
    FROM public.subsidies_structured 
    WHERE archived = true AND (run_id != p_run_id OR run_id IS NULL)
    ORDER BY url, created_at DESC
  );
  
  -- Mark run as rolled back
  UPDATE public.scrape_runs 
  SET status = 'rolled_back', completed_at = now()
  WHERE id = p_run_id;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_data_purge()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete in correct order to respect foreign key constraints
  DELETE FROM public.document_extraction_reviews;
  DELETE FROM public.document_extraction_status;
  DELETE FROM public.subsidy_form_schemas;
  DELETE FROM public.subsidy_applications;
  DELETE FROM public.applications;
  DELETE FROM public.subsidy_matches;
  DELETE FROM public.subsidies_structured;
  DELETE FROM public.subsidies;
  DELETE FROM public.error_log WHERE raw_log_id IS NOT NULL;
  DELETE FROM public.raw_logs;
  DELETE FROM public.raw_scraped_pages;
  DELETE FROM public.error_log;
  
  INSERT INTO public.scraper_logs (session_id, status, message, details)
  VALUES (
    'system-purge-' || extract(epoch from now())::text,
    'completed',
    'Complete data purge executed successfully',
    jsonb_build_object('operation', 'complete_purge', 'timestamp', now())
  );
END;
$$;