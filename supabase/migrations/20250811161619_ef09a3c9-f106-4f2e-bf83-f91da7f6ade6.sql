-- Remove SECURITY DEFINER from pipeline observability views
-- This fixes the 6 security linter errors for views with SECURITY DEFINER

-- Drop and recreate views without SECURITY DEFINER to fix linter issues
DROP VIEW IF EXISTS v_pipeline_health_24h CASCADE;
DROP VIEW IF EXISTS v_harvest_quality_by_source_24h CASCADE;
DROP VIEW IF EXISTS v_orphan_pages_recent CASCADE;
DROP VIEW IF EXISTS v_ai_yield_by_run CASCADE;
DROP VIEW IF EXISTS v_ai_errors_last_24h CASCADE;
DROP VIEW IF EXISTS v_active_run_status CASCADE;

-- Recreate v_pipeline_health_24h (no SECURITY DEFINER)
CREATE VIEW v_pipeline_health_24h AS
SELECT 
  pr.id,
  pr.status,
  pr.stage,
  pr.progress,
  pr.started_at,
  pr.ended_at,
  pr.config,
  pr.stats,
  COALESCE((pr.stats->'harvest'->>'pages_scraped')::int, 0) as total_pages,
  COALESCE((pr.stats->'ai'->>'pages_processed')::int, 0) as processed_pages,
  COALESCE((pr.stats->'ai'->>'pages_failed')::int, 0) as failed_pages,
  EXTRACT(EPOCH FROM (COALESCE(pr.ended_at, now()) - pr.started_at)) as duration_seconds
FROM pipeline_runs pr
WHERE pr.created_at >= now() - interval '24 hours'
ORDER BY pr.started_at DESC;

-- Recreate v_harvest_quality_by_source_24h (no SECURITY DEFINER)
CREATE VIEW v_harvest_quality_by_source_24h AS
SELECT 
  rsp.source_site,
  COUNT(*) as pages_harvested,
  AVG(LENGTH(rsp.raw_text))::int as avg_content_length,
  COUNT(*) FILTER (WHERE LENGTH(rsp.raw_text) >= 1000) as quality_pages,
  COUNT(*) as recent_pages
FROM raw_scraped_pages rsp
WHERE rsp.created_at >= now() - interval '24 hours'
GROUP BY rsp.source_site
ORDER BY pages_harvested DESC;

-- Recreate v_orphan_pages_recent (no SECURITY DEFINER) 
CREATE VIEW v_orphan_pages_recent AS
SELECT 
  rsp.id,
  rsp.source_site,
  rsp.source_url,
  rsp.created_at,
  LENGTH(rsp.raw_text) as content_length
FROM raw_scraped_pages rsp
WHERE rsp.run_id IS NULL 
  AND rsp.created_at >= now() - interval '6 hours'
ORDER BY rsp.created_at DESC;

-- Recreate v_ai_yield_by_run (no SECURITY DEFINER)
CREATE VIEW v_ai_yield_by_run AS
SELECT 
  acr.run_id,
  acr.model,
  acr.started_at,
  acr.ended_at,
  acr.pages_processed,
  acr.subs_created,
  (CASE WHEN acr.pages_processed > 0 THEN 
    (acr.subs_created::float / acr.pages_processed * 100)::int 
    ELSE 0 END) as yield_percentage
FROM ai_content_runs acr
ORDER BY acr.ended_at DESC NULLS LAST;

-- Recreate v_ai_errors_last_24h (no SECURITY DEFINER)
CREATE VIEW v_ai_errors_last_24h AS
SELECT 
  ace.id,
  ace.run_id,
  ace.stage,
  ace.message,
  ace.source_url,
  ace.created_at
FROM ai_content_errors ace
WHERE ace.created_at >= now() - interval '24 hours'
ORDER BY ace.created_at DESC;

-- Recreate v_active_run_status (no SECURITY DEFINER)
CREATE VIEW v_active_run_status AS
SELECT 
  pr.id,
  pr.status,
  pr.stage,
  pr.progress,
  pr.started_at,
  pr.config,
  EXTRACT(EPOCH FROM (now() - pr.started_at))::int as runtime_seconds
FROM pipeline_runs pr
WHERE pr.status IN ('running', 'queued', 'pending')
ORDER BY pr.started_at DESC
LIMIT 1;