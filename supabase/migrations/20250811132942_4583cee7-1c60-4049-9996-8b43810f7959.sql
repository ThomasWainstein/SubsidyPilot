-- Create comprehensive data purge function
CREATE OR REPLACE FUNCTION public.purge_pipeline_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB := '{}';
  deleted_counts JSONB := '{}';
BEGIN
  -- Delete pipeline-related data in dependency order
  
  -- AI content errors
  DELETE FROM ai_content_errors;
  GET DIAGNOSTICS deleted_counts = JSON_OBJECT('ai_content_errors' VALUE ROW_COUNT);
  result = result || deleted_counts;
  
  -- AI content runs
  DELETE FROM ai_content_runs;
  GET DIAGNOSTICS deleted_counts = JSON_OBJECT('ai_content_runs' VALUE ROW_COUNT);
  result = result || deleted_counts;
  
  -- Harvest issues
  DELETE FROM harvest_issues;
  GET DIAGNOSTICS deleted_counts = JSON_OBJECT('harvest_issues' VALUE ROW_COUNT);
  result = result || deleted_counts;
  
  -- Subsidies structured (main data)
  DELETE FROM subsidies_structured;
  GET DIAGNOSTICS deleted_counts = JSON_OBJECT('subsidies_structured' VALUE ROW_COUNT);
  result = result || deleted_counts;
  
  -- Raw scraped pages
  DELETE FROM raw_scraped_pages;
  GET DIAGNOSTICS deleted_counts = JSON_OBJECT('raw_scraped_pages' VALUE ROW_COUNT);
  result = result || deleted_counts;
  
  -- Pipeline runs
  DELETE FROM pipeline_runs;
  GET DIAGNOSTICS deleted_counts = JSON_OBJECT('pipeline_runs' VALUE ROW_COUNT);
  result = result || deleted_counts;
  
  -- Scraper logs
  DELETE FROM scraper_logs;
  GET DIAGNOSTICS deleted_counts = JSON_OBJECT('scraper_logs' VALUE ROW_COUNT);
  result = result || deleted_counts;
  
  -- Add summary
  result = result || jsonb_build_object(
    'operation', 'complete_pipeline_purge',
    'timestamp', now(),
    'status', 'completed'
  );
  
  RETURN result;
END;
$function$;