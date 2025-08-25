-- Fix function conflicts and complete emergency repair setup

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS cleanup_stuck_syncs();

-- Create the corrected cleanup function
CREATE OR REPLACE FUNCTION cleanup_stuck_syncs()
RETURNS TABLE (
    cleaned_processes INTEGER,
    cleanup_timestamp TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH cleanup AS (
        UPDATE api_sync_logs 
        SET 
            status = 'failed',
            completed_at = NOW(),
            errors = jsonb_build_object(
                'reason', 'Process automatically cleaned - exceeded timeout',
                'cleanup_timestamp', NOW()
            )
        WHERE 
            status = 'running' 
            AND started_at < NOW() - INTERVAL '30 minutes'
        RETURNING id
    )
    SELECT 
        COUNT(*)::INTEGER,
        NOW()
    FROM cleanup;
$$;

-- Create the health check function
CREATE OR REPLACE FUNCTION check_sync_health()
RETURNS TABLE (
    issue_type TEXT,
    severity TEXT,
    description TEXT,
    count INTEGER,
    recommended_action TEXT
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        'stuck_processes'::TEXT,
        'CRITICAL'::TEXT,
        'Sync processes stuck in running state'::TEXT,
        COUNT(*)::INTEGER,
        'Run emergency cleanup function'::TEXT
    FROM api_sync_logs 
    WHERE status = 'running' 
    AND started_at < NOW() - INTERVAL '30 minutes'
    
    UNION ALL
    
    SELECT 
        'recent_failures'::TEXT,
        CASE 
            WHEN COUNT(*) > 10 THEN 'CRITICAL'
            WHEN COUNT(*) > 5 THEN 'HIGH'
            ELSE 'MEDIUM'
        END::TEXT,
        'Recent sync failures detected'::TEXT,
        COUNT(*)::INTEGER,
        'Investigate error messages and API health'::TEXT
    FROM api_sync_logs 
    WHERE status = 'failed' 
    AND started_at > NOW() - INTERVAL '6 hours';
$$;