-- Fix security issues from change detection system

-- 1. Fix the security definer view by making it a regular function instead
DROP VIEW IF EXISTS change_detection_dashboard;

-- Create a function instead of a view to avoid security definer issues
CREATE OR REPLACE FUNCTION get_change_detection_dashboard()
RETURNS TABLE(
    api_source TEXT,
    last_check TIMESTAMP,
    last_check_had_changes BOOLEAN,
    change_summary TEXT,
    check_frequency TEXT,
    next_check TIMESTAMP,
    polling_enabled BOOLEAN,
    failure_count INTEGER,
    api_currently_available BOOLEAN,
    last_response_time INTEGER,
    hours_since_last_check NUMERIC,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cds.api_source,
        cds.last_check,
        cds.changes_detected as last_check_had_changes,
        cds.change_summary,
        ps.check_frequency,
        ps.next_check,
        ps.enabled as polling_enabled,
        ps.failure_count,
        ah.is_available as api_currently_available,
        ah.response_time_ms as last_response_time,
        EXTRACT(EPOCH FROM (NOW() - cds.last_check))/3600 as hours_since_last_check,
        CASE 
            WHEN ps.failure_count >= ps.max_failures THEN 'disabled'::TEXT
            WHEN NOT COALESCE(ah.is_available, true) THEN 'unavailable'::TEXT
            WHEN cds.changes_detected THEN 'changes_detected'::TEXT
            WHEN ps.next_check <= NOW() THEN 'check_due'::TEXT
            ELSE 'healthy'::TEXT
        END as status
    FROM change_detection_state cds
    LEFT JOIN polling_schedule ps ON cds.api_source = ps.api_source
    LEFT JOIN LATERAL (
        SELECT is_available, response_time_ms, check_timestamp
        FROM api_health 
        WHERE api_source = cds.api_source 
        ORDER BY check_timestamp DESC 
        LIMIT 1
    ) ah ON true;
END;
$$;

-- 2. Fix the get_apis_due_for_check function by adding search_path
DROP FUNCTION IF EXISTS get_apis_due_for_check();

CREATE OR REPLACE FUNCTION get_apis_due_for_check()
RETURNS TABLE(api_source TEXT, priority INTEGER, hours_overdue NUMERIC) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.api_source,
        ps.priority,
        EXTRACT(EPOCH FROM (NOW() - ps.next_check))/3600 as hours_overdue
    FROM polling_schedule ps
    WHERE ps.enabled = true
    AND ps.next_check <= NOW()
    AND ps.failure_count < ps.max_failures
    ORDER BY ps.priority, ps.next_check;
END;
$$;

-- Grant execute permissions to authenticated users for the dashboard function
GRANT EXECUTE ON FUNCTION get_change_detection_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION get_apis_due_for_check() TO authenticated;