-- Create comprehensive data purge function (fixed syntax)
CREATE OR REPLACE FUNCTION public.purge_pipeline_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ai_errors_count INTEGER;
  ai_runs_count INTEGER;
  harvest_issues_count INTEGER;
  subsidies_count INTEGER;
  pages_count INTEGER;
  runs_count INTEGER;
  logs_count INTEGER;
BEGIN
  -- Delete pipeline-related data in dependency order
  
  -- AI content errors
  DELETE FROM ai_content_errors;
  GET DIAGNOSTICS ai_errors_count = ROW_COUNT;
  
  -- AI content runs
  DELETE FROM ai_content_runs;
  GET DIAGNOSTICS ai_runs_count = ROW_COUNT;
  
  -- Harvest issues
  DELETE FROM harvest_issues;
  GET DIAGNOSTICS harvest_issues_count = ROW_COUNT;
  
  -- Subsidies structured (main data)
  DELETE FROM subsidies_structured;
  GET DIAGNOSTICS subsidies_count = ROW_COUNT;
  
  -- Raw scraped pages
  DELETE FROM raw_scraped_pages;
  GET DIAGNOSTICS pages_count = ROW_COUNT;
  
  -- Pipeline runs
  DELETE FROM pipeline_runs;
  GET DIAGNOSTICS runs_count = ROW_COUNT;
  
  -- Scraper logs
  DELETE FROM scraper_logs;
  GET DIAGNOSTICS logs_count = ROW_COUNT;
  
  -- Return summary
  RETURN jsonb_build_object(
    'operation', 'complete_pipeline_purge',
    'timestamp', now(),
    'status', 'completed',
    'deleted_counts', jsonb_build_object(
      'ai_content_errors', ai_errors_count,
      'ai_content_runs', ai_runs_count,
      'harvest_issues', harvest_issues_count,
      'subsidies_structured', subsidies_count,
      'raw_scraped_pages', pages_count,
      'pipeline_runs', runs_count,
      'scraper_logs', logs_count
    )
  );
END;
$function$;