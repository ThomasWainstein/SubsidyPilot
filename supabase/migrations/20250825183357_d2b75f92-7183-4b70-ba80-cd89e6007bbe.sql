-- 🚨 EMERGENCY SYNC REPAIR - Database Cleanup & Fixes

-- ====================================================================
-- STEP 1: CLEAN UP STUCK SYNC PROCESSES (Critical Priority)
-- ====================================================================

-- Clean up stuck processes (older than 30 minutes)
UPDATE api_sync_logs 
SET 
    status = 'failed',
    completed_at = NOW(),
    errors = jsonb_build_object(
        'reason', 'Process stuck - cleaned up by emergency repair script',
        'cleanup_timestamp', NOW()
    )
WHERE 
    status = 'running' 
    AND started_at < NOW() - INTERVAL '30 minutes';

-- ====================================================================
-- STEP 2: RESET POLLING SCHEDULES (Fix Automatic Sync)
-- ====================================================================

-- Reset change detection to force refresh
UPDATE change_detection_state 
SET 
    changes_detected = true,
    change_summary = 'Emergency repair - forcing system refresh',
    last_check = NOW() - INTERVAL '10 minutes',
    updated_at = NOW()
WHERE api_source = 'les-aides-fr';

-- Reset polling schedule if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'polling_schedule') THEN
        UPDATE polling_schedule 
        SET 
            next_check = NOW() - INTERVAL '5 minutes',
            failure_count = 0,
            enabled = true
        WHERE api_source = 'les-aides-fr';
    END IF;
END
$$;

-- ====================================================================
-- STEP 3: CREATE EMERGENCY SYNC MONITORING FUNCTIONS
-- ====================================================================

-- Function to monitor sync health
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
    -- Check for stuck processes
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
    
    -- Check for recent sync failures
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
    AND started_at > NOW() - INTERVAL '6 hours'
    
    UNION ALL
    
    -- Check for stagnant data (no new subsidies)
    SELECT 
        'stagnant_data'::TEXT,
        'WARNING'::TEXT,
        'No new subsidies added recently'::TEXT,
        COUNT(DISTINCT api_source)::INTEGER,
        'Verify API sources are returning new data'::TEXT
    FROM api_sync_logs 
    WHERE records_added = 0 
    AND started_at > NOW() - INTERVAL '24 hours'
    AND status = 'completed';
$$;

-- Function to automatically clean stuck processes
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

-- ====================================================================
-- STEP 4: CREATE API FUNCTION MAPPING TABLE
-- ====================================================================

-- Create table for correct function mappings
CREATE TABLE IF NOT EXISTS api_function_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    api_source TEXT NOT NULL UNIQUE,
    edge_function_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on the mappings table
ALTER TABLE api_function_mappings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view function mappings" 
ON api_function_mappings 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage function mappings" 
ON api_function_mappings 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Insert correct mappings
INSERT INTO api_function_mappings (api_source, edge_function_name) 
VALUES 
    ('les-aides-fr', 'ingest-les-aides-orchestrator'),
    ('aides-territoires', 'sync-aides-territoires'),
    ('romania-data', 'sync-romania-data')
ON CONFLICT (api_source) DO UPDATE SET
    edge_function_name = EXCLUDED.edge_function_name,
    is_active = true,
    updated_at = NOW();

-- ====================================================================
-- STEP 5: CREATE SYSTEM STATUS DASHBOARD FUNCTION
-- ====================================================================

CREATE OR REPLACE FUNCTION get_sync_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result jsonb := '{}';
    stuck_count INTEGER;
    total_subsidies INTEGER;
    recent_syncs INTEGER;
    success_rate NUMERIC;
BEGIN
    -- Count stuck processes
    SELECT COUNT(*) INTO stuck_count
    FROM api_sync_logs 
    WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes';
    
    -- Count total subsidies
    SELECT COUNT(*) INTO total_subsidies
    FROM subsidies;
    
    -- Count recent syncs and success rate
    SELECT 
        COUNT(*) as total_syncs,
        ROUND(
            100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 
            1
        ) as success_rate_calc
    INTO recent_syncs, success_rate
    FROM api_sync_logs 
    WHERE started_at > NOW() - INTERVAL '24 hours';
    
    -- Build result JSON
    result := jsonb_build_object(
        'timestamp', NOW(),
        'overall_status', CASE 
            WHEN stuck_count > 0 THEN 'critical'
            WHEN success_rate < 70 THEN 'degraded'
            ELSE 'healthy'
        END,
        'metrics', jsonb_build_object(
            'stuck_processes', stuck_count,
            'total_subsidies', total_subsidies,
            'recent_syncs_24h', recent_syncs,
            'success_rate_24h', COALESCE(success_rate, 100)
        ),
        'health_summary', jsonb_build_object(
            'database_ready', total_subsidies > 0,
            'sync_processes_healthy', stuck_count = 0,
            'recent_activity', recent_syncs > 0
        )
    );
    
    RETURN result;
END;
$$;

-- ====================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ====================================================================

-- Check cleanup results
-- SELECT COUNT(*) as remaining_stuck_processes FROM api_sync_logs WHERE status = 'running';

-- Check subsidy counts by source  
-- SELECT source, COUNT(*) as count FROM subsidies GROUP BY source ORDER BY count DESC;

-- Check recent sync activity
-- SELECT api_source, status, COUNT(*) FROM api_sync_logs WHERE started_at > NOW() - INTERVAL '24 hours' GROUP BY api_source, status;

-- Run health check
-- SELECT * FROM check_sync_health();

-- Get system status
-- SELECT get_sync_system_status();