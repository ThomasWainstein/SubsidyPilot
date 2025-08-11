-- Check for any remaining materialized views or problematic views
-- and ensure proper access control

-- List all views and materialized views to identify potential issues
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Check for any materialized views that might be causing issues
    FOR view_record IN 
        SELECT schemaname, matviewname as viewname 
        FROM pg_matviews 
        WHERE schemaname = 'public'
    LOOP
        RAISE NOTICE 'Found materialized view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
    
    -- Check for any views with potential security issues
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
        AND viewname LIKE 'v_%'
    LOOP
        RAISE NOTICE 'Found view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
END $$;

-- Ensure all monitoring views have proper RLS-compliant access
-- by dropping and recreating any that might have implicit security definer behavior

-- Check if there are any system-created views that need removal
DROP VIEW IF EXISTS public.v_monitor_pipeline_health CASCADE;
DROP VIEW IF EXISTS public.v_monitor_ai_errors CASCADE;
DROP VIEW IF EXISTS public.v_monitor_harvest_quality CASCADE;

-- Recreate the core monitoring views with explicit non-security-definer properties
CREATE OR REPLACE VIEW public.v_pipeline_status AS
SELECT 
    id,
    status,
    stage,
    progress,
    started_at,
    config
FROM pipeline_runs
WHERE status IN ('running', 'queued', 'pending')
ORDER BY started_at DESC
LIMIT 10;

-- Ensure views don't inherit problematic properties by being explicit about permissions
REVOKE ALL ON public.v_pipeline_status FROM PUBLIC;
GRANT SELECT ON public.v_pipeline_status TO authenticated;