-- Fix safe_data_purge function to include WHERE clauses
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
  
  -- Safe purge in correct order (respecting foreign keys) with explicit WHERE clauses
  DELETE FROM subsidy_categories WHERE TRUE;
  DELETE FROM subsidy_locations WHERE TRUE;
  DELETE FROM subsidies WHERE TRUE;
  
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