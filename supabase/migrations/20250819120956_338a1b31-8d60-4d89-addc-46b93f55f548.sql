-- Fix ambiguous column reference in dashboard function
DROP FUNCTION IF EXISTS get_change_detection_dashboard();

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
        cds.api_source AS api_source,
        cds.last_check AS last_check,
        cds.changes_detected AS last_check_had_changes,
        cds.change_summary AS change_summary,
        ps.check_frequency AS check_frequency,
        ps.next_check AS next_check,
        ps.enabled AS polling_enabled,
        ps.failure_count AS failure_count,
        ah.is_available AS api_currently_available,
        ah.response_time_ms AS last_response_time,
        EXTRACT(EPOCH FROM (NOW() - cds.last_check))/3600 AS hours_since_last_check,
        CASE 
            WHEN ps.failure_count >= ps.max_failures THEN 'disabled'::TEXT
            WHEN NOT COALESCE(ah.is_available, true) THEN 'unavailable'::TEXT
            WHEN cds.changes_detected THEN 'changes_detected'::TEXT
            WHEN ps.next_check <= NOW() THEN 'check_due'::TEXT
            ELSE 'healthy'::TEXT
        END AS status
    FROM change_detection_state cds
    LEFT JOIN polling_schedule ps ON cds.api_source = ps.api_source
    LEFT JOIN LATERAL (
        SELECT ah_inner.is_available, ah_inner.response_time_ms, ah_inner.check_timestamp
        FROM api_health ah_inner
        WHERE ah_inner.api_source = cds.api_source 
        ORDER BY ah_inner.check_timestamp DESC 
        LIMIT 1
    ) ah ON true;
END;
$$;