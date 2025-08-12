-- Purge AI processing and subsidy data while preserving raw scraped pages
CREATE OR REPLACE FUNCTION public.purge_ai_and_subsidy_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ai_errors_count INTEGER;
  ai_runs_count INTEGER;
  ai_extractions_count INTEGER;
  subsidies_structured_count INTEGER;
  subsidies_count INTEGER;
  application_forms_count INTEGER;
  extraction_qa_count INTEGER;
BEGIN
  -- Delete AI content errors
  DELETE FROM ai_content_errors;
  GET DIAGNOSTICS ai_errors_count = ROW_COUNT;
  
  -- Delete AI content runs
  DELETE FROM ai_content_runs;
  GET DIAGNOSTICS ai_runs_count = ROW_COUNT;
  
  -- Delete AI raw extractions
  DELETE FROM ai_raw_extractions;
  GET DIAGNOSTICS ai_extractions_count = ROW_COUNT;
  
  -- Delete structured subsidies
  DELETE FROM subsidies_structured;
  GET DIAGNOSTICS subsidies_structured_count = ROW_COUNT;
  
  -- Delete subsidies
  DELETE FROM subsidies;
  GET DIAGNOSTICS subsidies_count = ROW_COUNT;
  
  -- Delete application forms
  DELETE FROM application_forms;
  GET DIAGNOSTICS application_forms_count = ROW_COUNT;
  
  -- Delete QA results
  DELETE FROM extraction_qa_results;
  GET DIAGNOSTICS extraction_qa_count = ROW_COUNT;
  
  -- Return summary (keeping raw_scraped_pages intact)
  RETURN jsonb_build_object(
    'operation', 'purge_ai_and_subsidy_data',
    'timestamp', now(),
    'status', 'completed',
    'raw_scraped_pages', 'PRESERVED',
    'deleted_counts', jsonb_build_object(
      'ai_content_errors', ai_errors_count,
      'ai_content_runs', ai_runs_count,
      'ai_raw_extractions', ai_extractions_count,
      'subsidies_structured', subsidies_structured_count,
      'subsidies', subsidies_count,
      'application_forms', application_forms_count,
      'extraction_qa_results', extraction_qa_count
    )
  );
END;
$function$;

-- Execute the purge
SELECT public.purge_ai_and_subsidy_data();