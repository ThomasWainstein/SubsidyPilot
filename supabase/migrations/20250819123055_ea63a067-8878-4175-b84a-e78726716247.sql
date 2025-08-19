CREATE OR REPLACE FUNCTION safe_data_purge()
RETURNS JSONB AS $$
DECLARE
    backup_timestamp TEXT;
    subsidies_count INTEGER;
    locations_count INTEGER;
    categories_count INTEGER;
BEGIN
    -- Generate timestamp for backup tables
    backup_timestamp := to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- Count existing data
    SELECT COUNT(*) INTO subsidies_count FROM subsidies;
    SELECT COUNT(*) INTO locations_count FROM subsidy_locations;
    SELECT COUNT(*) INTO categories_count FROM subsidy_categories;
    
    -- Create backup tables with timestamp
    EXECUTE format('CREATE TABLE subsidies_backup_%s AS SELECT * FROM subsidies', backup_timestamp);
    EXECUTE format('CREATE TABLE subsidy_locations_backup_%s AS SELECT * FROM subsidy_locations', backup_timestamp);
    EXECUTE format('CREATE TABLE subsidy_categories_backup_%s AS SELECT * FROM subsidy_categories', backup_timestamp);
    
    -- Purge existing data (in correct order due to foreign keys)
    DELETE FROM subsidy_categories;
    DELETE FROM subsidy_locations;
    DELETE FROM subsidies;
    
    -- Reset change detection if exists
    DELETE FROM change_detection_state WHERE api_source = 'les-aides-fr';
    
    RETURN jsonb_build_object(
        'success', true,
        'backup_timestamp', backup_timestamp,
        'backed_up_subsidies', subsidies_count,
        'backed_up_locations', locations_count,
        'backed_up_categories', categories_count
    );
END;
$$ LANGUAGE plpgsql;