-- Update the complete_data_purge function to handle foreign key dependencies correctly
CREATE OR REPLACE FUNCTION public.complete_data_purge()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete in correct order to respect foreign key constraints
  -- Start with tables that reference others, then work down to base tables
  
  -- Delete extraction and application related data first
  DELETE FROM document_extraction_reviews;
  DELETE FROM document_extraction_status;
  DELETE FROM subsidy_form_schemas;
  DELETE FROM subsidy_applications;
  DELETE FROM applications;
  DELETE FROM subsidy_matches;
  
  -- Delete main subsidy data
  DELETE FROM subsidies_structured;
  DELETE FROM subsidies;
  
  -- Delete error logs that reference raw_logs
  DELETE FROM error_log WHERE raw_log_id IS NOT NULL;
  
  -- Now we can safely delete raw_logs and other base tables
  DELETE FROM raw_logs;
  DELETE FROM raw_scraped_pages;
  
  -- Delete any remaining error logs
  DELETE FROM error_log;
  
  -- Log the purge operation
  INSERT INTO scraper_logs (session_id, status, message, details)
  VALUES (
    'system-purge-' || extract(epoch from now())::text,
    'completed',
    'Complete data purge executed successfully',
    jsonb_build_object(
      'operation', 'complete_purge',
      'timestamp', now(),
      'tables_purged', ARRAY[
        'subsidies', 
        'subsidies_structured', 
        'raw_scraped_pages', 
        'raw_logs', 
        'error_log', 
        'subsidy_matches', 
        'applications', 
        'subsidy_applications', 
        'subsidy_form_schemas',
        'document_extraction_status',
        'document_extraction_reviews'
      ]
    )
  );
END;
$function$;