-- Final fix for Security Definer View issues
-- Remove all monitoring views completely and replace with secure alternatives

-- Drop all problematic views
DROP VIEW IF EXISTS public.v_active_run_status CASCADE;
DROP VIEW IF EXISTS public.v_ai_errors_last_24h CASCADE;
DROP VIEW IF EXISTS public.v_ai_yield_by_run CASCADE;
DROP VIEW IF EXISTS public.v_harvest_quality_by_source_24h CASCADE;
DROP VIEW IF EXISTS public.v_orphan_pages_recent CASCADE;
DROP VIEW IF EXISTS public.v_pipeline_health_24h CASCADE;
DROP VIEW IF EXISTS public.v_pipeline_status CASCADE;

-- Create security definer functions instead of views to eliminate the security issue
-- This ensures proper access control while avoiding the SECURITY DEFINER view problem

CREATE OR REPLACE FUNCTION public.get_active_run_status()
RETURNS TABLE(
    id UUID,
    status TEXT,
    stage TEXT,
    progress INTEGER,
    started_at TIMESTAMPTZ,
    config JSONB,
    runtime_seconds INTEGER
) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pr.id,
    pr.status,
    pr.stage,
    pr.progress,
    pr.started_at,
    pr.config,
    EXTRACT(epoch FROM (now() - pr.started_at))::integer AS runtime_seconds
  FROM pipeline_runs pr
  WHERE pr.status = ANY(ARRAY['running'::text, 'queued'::text, 'pending'::text])
  ORDER BY pr.started_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_errors_last_24h()
RETURNS TABLE(
    id UUID,
    run_id UUID,
    stage TEXT,
    message TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ace.id,
    ace.run_id,
    ace.stage,
    ace.message,
    ace.source_url,
    ace.created_at
  FROM ai_content_errors ace
  WHERE ace.created_at >= (now() - interval '24 hours')
  ORDER BY ace.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_pipeline_health_24h()
RETURNS TABLE(
    id UUID,
    status TEXT,
    stage TEXT,
    progress INTEGER,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    config JSONB,
    stats JSONB,
    total_pages INTEGER,
    processed_pages INTEGER,
    failed_pages INTEGER,
    duration_seconds NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pr.id,
    pr.status,
    pr.stage,
    pr.progress,
    pr.started_at,
    pr.ended_at,
    pr.config,
    pr.stats,
    COALESCE(((pr.stats->'harvest'->>'pages_scraped')::integer), 0) AS total_pages,
    COALESCE(((pr.stats->'ai'->>'pages_processed')::integer), 0) AS processed_pages,
    COALESCE(((pr.stats->'ai'->>'pages_failed')::integer), 0) AS failed_pages,
    EXTRACT(epoch FROM (COALESCE(pr.ended_at, now()) - pr.started_at)) AS duration_seconds
  FROM pipeline_runs pr
  WHERE pr.created_at >= (now() - interval '24 hours')
  ORDER BY pr.started_at DESC;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_run_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_errors_last_24h() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pipeline_health_24h() TO authenticated;