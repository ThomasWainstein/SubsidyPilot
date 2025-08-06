-- =========================================
-- COMPLETE DATA PURGE - FRESH START
-- Safely purge all subsidies and related data for fresh pipeline run
-- =========================================

-- Use the existing purge function to safely clear all data
SELECT public.complete_data_purge();

-- Additionally clear any new tables we created during the fixes
DELETE FROM public.content_versions;
DELETE FROM public.content_change_log; 
DELETE FROM public.document_subsidy_mappings;
DELETE FROM public.review_assignments;
DELETE FROM public.review_decisions;

-- Clear pipeline execution history (keep the infrastructure repair log)
DELETE FROM public.pipeline_executions 
WHERE NOT (session_id LIKE 'infrastructure-repair-%');

-- Reset error log status for any remaining errors
UPDATE public.error_log 
SET resolution_status = 'open', resolved_at = NULL, resolved_by = NULL, resolution_notes = NULL
WHERE resolution_status = 'resolved' 
AND error_type != 'auto_schema_extraction_trigger';

-- Log the purge operation
INSERT INTO public.scraper_logs (
    session_id,
    status,
    message,
    details,
    timestamp
) VALUES (
    'data-purge-' || extract(epoch from now())::text,
    'completed',
    'Complete data purge executed - ready for fresh pipeline run',
    jsonb_build_object(
        'operation', 'complete_purge',
        'tables_purged', ARRAY[
            'subsidies', 
            'subsidies_structured', 
            'raw_scraped_pages', 
            'raw_logs', 
            'content_versions',
            'content_change_log',
            'document_subsidy_mappings',
            'review_assignments',
            'review_decisions',
            'pipeline_executions'
        ],
        'infrastructure_preserved', true,
        'ready_for_pipeline', true,
        'timestamp', now()
    ),
    now()
);