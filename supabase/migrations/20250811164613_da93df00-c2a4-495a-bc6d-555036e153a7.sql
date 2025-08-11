-- Fix Security Definer View issues by recreating views with proper access control
-- Drop existing views that may have security definer properties
DROP VIEW IF EXISTS public.v_active_run_status CASCADE;
DROP VIEW IF EXISTS public.v_ai_errors_last_24h CASCADE;
DROP VIEW IF EXISTS public.v_ai_yield_by_run CASCADE;
DROP VIEW IF EXISTS public.v_harvest_quality_by_source_24h CASCADE;
DROP VIEW IF EXISTS public.v_orphan_pages_recent CASCADE;
DROP VIEW IF EXISTS public.v_pipeline_health_24h CASCADE;

-- Recreate views without SECURITY DEFINER, relying on RLS instead
CREATE VIEW public.v_active_run_status AS 
SELECT 
  id,
  status,
  stage,
  progress,
  started_at,
  config,
  EXTRACT(epoch FROM (now() - started_at))::integer AS runtime_seconds
FROM pipeline_runs pr
WHERE status = ANY(ARRAY['running'::text, 'queued'::text, 'pending'::text])
ORDER BY started_at DESC
LIMIT 1;

CREATE VIEW public.v_ai_errors_last_24h AS
SELECT 
  id,
  run_id,
  stage,
  message,
  source_url,
  created_at
FROM ai_content_errors ace
WHERE created_at >= (now() - interval '24 hours')
ORDER BY created_at DESC;

CREATE VIEW public.v_ai_yield_by_run AS
SELECT 
  run_id,
  model,
  started_at,
  ended_at,
  pages_processed,
  subs_created,
  CASE 
    WHEN pages_processed > 0 
    THEN ((subs_created::double precision / pages_processed::double precision) * 100)::integer
    ELSE 0
  END AS yield_percentage
FROM ai_content_runs acr
ORDER BY ended_at DESC NULLS LAST;

CREATE VIEW public.v_harvest_quality_by_source_24h AS
SELECT 
  source_site,
  count(*) AS pages_harvested,
  avg(length(raw_text))::integer AS avg_content_length,
  count(*) FILTER (WHERE length(raw_text) >= 1000) AS quality_pages,
  count(*) AS recent_pages
FROM raw_scraped_pages rsp
WHERE created_at >= (now() - interval '24 hours')
GROUP BY source_site
ORDER BY count(*) DESC;

CREATE VIEW public.v_orphan_pages_recent AS
SELECT 
  id,
  source_site,
  source_url,
  created_at,
  length(raw_text) AS content_length
FROM raw_scraped_pages rsp
WHERE run_id IS NULL 
  AND created_at >= (now() - interval '6 hours')
ORDER BY created_at DESC;

CREATE VIEW public.v_pipeline_health_24h AS
SELECT 
  id,
  status,
  stage,
  progress,
  started_at,
  ended_at,
  config,
  stats,
  COALESCE(((stats->'harvest'->>'pages_scraped')::integer), 0) AS total_pages,
  COALESCE(((stats->'ai'->>'pages_processed')::integer), 0) AS processed_pages,
  COALESCE(((stats->'ai'->>'pages_failed')::integer), 0) AS failed_pages,
  EXTRACT(epoch FROM (COALESCE(ended_at, now()) - started_at)) AS duration_seconds
FROM pipeline_runs pr
WHERE created_at >= (now() - interval '24 hours')
ORDER BY started_at DESC;

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.v_active_run_status TO authenticated;
GRANT SELECT ON public.v_ai_errors_last_24h TO authenticated;
GRANT SELECT ON public.v_ai_yield_by_run TO authenticated;
GRANT SELECT ON public.v_harvest_quality_by_source_24h TO authenticated;
GRANT SELECT ON public.v_orphan_pages_recent TO authenticated;
GRANT SELECT ON public.v_pipeline_health_24h TO authenticated;