-- Smart Change Detection System Database Setup

-- 1. Change Detection State Table
CREATE TABLE IF NOT EXISTS change_detection_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_source TEXT UNIQUE NOT NULL,
    last_check TIMESTAMP DEFAULT NOW(),
    last_known_state JSONB,
    changes_detected BOOLEAN DEFAULT false,
    change_summary TEXT,
    detection_method TEXT DEFAULT 'metadata',
    auto_sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Change History Log
CREATE TABLE IF NOT EXISTS change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_source TEXT NOT NULL,
    check_timestamp TIMESTAMP DEFAULT NOW(),
    changes_detected BOOLEAN NOT NULL,
    change_type TEXT, -- 'new_items', 'content_change', 'count_change', 'api_status'
    change_details JSONB,
    previous_state JSONB,
    current_state JSONB,
    sync_triggered BOOLEAN DEFAULT false,
    sync_log_id UUID REFERENCES api_sync_logs(id)
);

-- 3. Smart Polling Schedule
CREATE TABLE IF NOT EXISTS polling_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_source TEXT NOT NULL,
    check_frequency TEXT NOT NULL, -- 'hourly', 'daily', 'weekly'
    next_check TIMESTAMP NOT NULL,
    last_check TIMESTAMP,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    failure_count INTEGER DEFAULT 0,
    max_failures INTEGER DEFAULT 5
);

-- 4. API Health Monitoring
CREATE TABLE IF NOT EXISTS api_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_source TEXT NOT NULL,
    check_timestamp TIMESTAMP DEFAULT NOW(),
    response_time_ms INTEGER,
    status_code INTEGER,
    is_available BOOLEAN NOT NULL,
    error_message TEXT,
    total_records_available INTEGER,
    rate_limit_remaining INTEGER,
    rate_limit_reset TIMESTAMP
);

-- Insert default polling schedules
INSERT INTO polling_schedule (api_source, check_frequency, next_check, priority) VALUES
('les-aides-fr', 'hourly', NOW() + INTERVAL '1 hour', 1),
('romania-open-data', 'daily', NOW() + INTERVAL '2 hours', 2),
('eu-open-data', 'weekly', NOW() + INTERVAL '3 hours', 3),
('aides-territoires', 'daily', NOW() + INTERVAL '4 hours', 1)
ON CONFLICT DO NOTHING;

-- Initialize change detection state for existing APIs
INSERT INTO change_detection_state (api_source, last_known_state, detection_method) VALUES
('les-aides-fr', '{"count": 3, "last_modified": null}', 'count_and_metadata'),
('romania-open-data', '{"count": 0, "last_check": null}', 'metadata'),
('eu-open-data', '{"count": 0, "last_check": null}', 'metadata'),
('aides-territoires', '{"count": 0, "last_check": null}', 'count')
ON CONFLICT (api_source) DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_change_detection_api_source ON change_detection_state(api_source);
CREATE INDEX IF NOT EXISTS idx_change_detection_last_check ON change_detection_state(last_check);
CREATE INDEX IF NOT EXISTS idx_change_history_api_source ON change_history(api_source);
CREATE INDEX IF NOT EXISTS idx_change_history_timestamp ON change_history(check_timestamp);
CREATE INDEX IF NOT EXISTS idx_polling_schedule_next_check ON polling_schedule(next_check);
CREATE INDEX IF NOT EXISTS idx_polling_schedule_enabled ON polling_schedule(enabled);
CREATE INDEX IF NOT EXISTS idx_api_health_timestamp ON api_health(check_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_health_api_source ON api_health(api_source);

-- 6. View for monitoring dashboard
CREATE OR REPLACE VIEW change_detection_dashboard AS
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
        WHEN ps.failure_count >= ps.max_failures THEN 'disabled'
        WHEN NOT COALESCE(ah.is_available, true) THEN 'unavailable'
        WHEN cds.changes_detected THEN 'changes_detected'
        WHEN ps.next_check <= NOW() THEN 'check_due'
        ELSE 'healthy'
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

-- 7. Function to get APIs due for checking
CREATE OR REPLACE FUNCTION get_apis_due_for_check()
RETURNS TABLE(api_source TEXT, priority INTEGER, hours_overdue NUMERIC) AS $$
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
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE change_detection_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE polling_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_health ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access
CREATE POLICY "Admins can manage change detection state" ON change_detection_state
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage change detection state" ON change_detection_state
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view change history" ON change_history
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage change history" ON change_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can manage polling schedule" ON polling_schedule
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage polling schedule" ON polling_schedule
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view api health" ON api_health
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage api health" ON api_health
    FOR ALL USING (auth.role() = 'service_role');