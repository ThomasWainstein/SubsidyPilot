-- Create backup tables and safe purge function
CREATE TABLE IF NOT EXISTS subsidies_backup AS SELECT * FROM subsidies WHERE 1=0;
CREATE TABLE IF NOT EXISTS subsidy_locations_backup AS SELECT * FROM subsidy_locations WHERE 1=0;
CREATE TABLE IF NOT EXISTS subsidy_categories_backup AS SELECT * FROM subsidy_categories WHERE 1=0;

-- Function to safely purge and backup data
CREATE OR REPLACE FUNCTION safe_data_purge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  backup_count INTEGER;
  locations_count INTEGER;
  categories_count INTEGER;
BEGIN
  -- Create timestamped backup
  EXECUTE format('CREATE TABLE subsidies_backup_%s AS SELECT * FROM subsidies', 
    to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'));
  
  -- Backup related data
  INSERT INTO subsidy_locations_backup SELECT * FROM subsidy_locations;
  INSERT INTO subsidy_categories_backup SELECT * FROM subsidy_categories;
  
  -- Get counts before purging
  SELECT COUNT(*) INTO backup_count FROM subsidies;
  SELECT COUNT(*) INTO locations_count FROM subsidy_locations;
  SELECT COUNT(*) INTO categories_count FROM subsidy_categories;
  
  -- Safe purge in correct order (respecting foreign keys)
  DELETE FROM subsidy_categories;
  DELETE FROM subsidy_locations;
  DELETE FROM subsidies;
  
  -- Reset change detection state for fresh start
  UPDATE change_detection_state 
  SET last_known_state = '{"count": 0, "last_modified": null}',
      changes_detected = false,
      change_summary = 'Data purged - ready for full refresh'
  WHERE api_source = 'les-aides-fr';
  
  -- Clear old sync logs (keep system logs)
  DELETE FROM api_sync_logs WHERE api_source IN ('les-aides', 'les-aides-fr-fixed');
  
  RETURN jsonb_build_object(
    'success', true,
    'backed_up_subsidies', backup_count,
    'backed_up_locations', locations_count,
    'backed_up_categories', categories_count,
    'backup_timestamp', now(),
    'status', 'Ready for full refresh'
  );
END;
$$;

-- Create progress tracking table
CREATE TABLE IF NOT EXISTS sync_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_session_id TEXT NOT NULL,
  api_source TEXT NOT NULL,
  total_pages INTEGER,
  pages_completed INTEGER DEFAULT 0,
  subsidies_processed INTEGER DEFAULT 0,
  subsidies_added INTEGER DEFAULT 0,
  current_status TEXT DEFAULT 'starting',
  eta_minutes INTEGER,
  error_count INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Enable RLS on new tables
ALTER TABLE subsidies_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsidy_locations_backup ENABLE ROW LEVEL SECURITY;  
ALTER TABLE subsidy_categories_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage backup data" ON subsidies_backup
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage backup data" ON subsidies_backup
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view sync progress" ON sync_progress
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage sync progress" ON sync_progress
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT EXECUTE ON FUNCTION safe_data_purge() TO authenticated;