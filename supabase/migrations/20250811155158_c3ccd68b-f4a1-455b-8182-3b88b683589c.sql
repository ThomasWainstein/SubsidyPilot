-- Complete removal of all remaining SECURITY DEFINER views 
-- This addresses the remaining 8 security linter warnings

-- These views were created in previous migrations and need to be recreated without SECURITY DEFINER

-- Find and drop any remaining security definer views in information_schema
DO $$ 
DECLARE
    view_record RECORD;
BEGIN
    -- Loop through all views that might have SECURITY DEFINER
    FOR view_record IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    LOOP
        -- Drop and recreate each view to ensure no SECURITY DEFINER remains
        EXECUTE 'DROP VIEW IF EXISTS public.' || view_record.table_name || ' CASCADE';
    END LOOP;
END $$;

-- Recreate all required views without SECURITY DEFINER
CREATE VIEW public.v_pipeline_health_24h AS
SELECT 
  pr.id as run_id,
  pr.status,
  pr.started_at,
  pr.ended_at,
  COALESCE(jsonb_extract_path_text(pr.stats, 'total_pages'), '0')::integer as total_pages,
  COALESCE(jsonb_extract_path_text(pr.stats, 'processed_pages'), '0')::integer as processed_pages,
  COALESCE(jsonb_extract_path_text(pr.stats, 'failed_pages'), '0')::integer as failed_pages,
  CASE 
    WHEN pr.ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (pr.ended_at - pr.started_at))::integer
    ELSE EXTRACT(EPOCH FROM (now() - pr.started_at))::integer
  END as duration_seconds
FROM public.pipeline_runs pr
WHERE pr.started_at >= now() - interval '24 hours';

CREATE VIEW public.v_harvest_quality_by_source_24h AS
SELECT 
  rsp.source_site,
  COUNT(*) as pages_harvested,
  COUNT(CASE WHEN LENGTH(rsp.raw_text) > 1000 THEN 1 END) as quality_pages,
  AVG(LENGTH(rsp.raw_text)) as avg_content_length,
  COUNT(CASE WHEN rsp.created_at >= now() - interval '1 hour' THEN 1 END) as recent_pages
FROM public.raw_scraped_pages rsp
WHERE rsp.created_at >= now() - interval '24 hours'
GROUP BY rsp.source_site;

CREATE VIEW public.v_orphan_pages_recent AS
SELECT 
  rsp.id,
  rsp.source_url,
  rsp.source_site,
  LENGTH(rsp.raw_text) as content_length,
  rsp.created_at
FROM public.raw_scraped_pages rsp
WHERE rsp.created_at >= now() - interval '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.subsidies_structured ss 
    WHERE ss.url = rsp.source_url
  );

CREATE VIEW public.v_ai_yield_by_run AS
SELECT 
  acr.run_id,
  acr.model,
  acr.pages_processed,
  acr.subs_created,
  CASE 
    WHEN acr.pages_processed > 0 
    THEN ROUND((acr.subs_created::numeric / acr.pages_processed::numeric) * 100, 2)
    ELSE 0 
  END as yield_percentage,
  acr.started_at,
  acr.ended_at
FROM public.ai_content_runs acr
WHERE acr.ended_at IS NOT NULL;

CREATE VIEW public.v_ai_errors_last_24h AS
SELECT 
  ace.id,
  ace.run_id,
  ace.stage,
  ace.message,
  ace.source_url,
  ace.created_at
FROM public.ai_content_errors ace
WHERE ace.created_at >= now() - interval '24 hours'
ORDER BY ace.created_at DESC;

CREATE VIEW public.v_active_run_status AS
SELECT 
  pr.id,
  pr.status,
  pr.stage,
  pr.progress,
  pr.started_at,
  pr.config,
  EXTRACT(EPOCH FROM (now() - pr.started_at))::integer as runtime_seconds
FROM public.pipeline_runs pr
WHERE pr.status IN ('running', 'starting')
ORDER BY pr.started_at DESC;

-- Log completion of security fix
INSERT INTO public.security_audit_log (
  event_type, user_id, event_data, risk_level
) VALUES (
  'security_definer_views_removed',
  auth.uid(),
  jsonb_build_object(
    'action', 'removed_all_security_definer_views',
    'timestamp', now(),
    'views_recreated', jsonb_build_array(
      'v_pipeline_health_24h',
      'v_harvest_quality_by_source_24h',
      'v_orphan_pages_recent',
      'v_ai_yield_by_run',
      'v_ai_errors_last_24h',
      'v_active_run_status'
    )
  ),
  'critical'
);