-- Purge all subsidies data from the database
-- This will remove all subsidy-related data to prepare for fresh data import

-- Delete in correct order to respect foreign key constraints
DELETE FROM public.subsidy_applications;
DELETE FROM public.applications WHERE subsidy_id IS NOT NULL;
DELETE FROM public.subsidy_matches;
DELETE FROM public.document_subsidy_mappings;
DELETE FROM public.subsidy_form_schemas;
DELETE FROM public.application_forms WHERE subsidy_id IS NOT NULL;
DELETE FROM public.subsidies_structured;
DELETE FROM public.subsidies;

-- Log the purge operation
INSERT INTO public.scraper_logs (session_id, status, message, details)
VALUES (
  'subsidies-purge-' || extract(epoch from now())::text,
  'completed',
  'All subsidies data purged successfully',
  jsonb_build_object(
    'operation', 'subsidies_purge', 
    'timestamp', now(),
    'triggered_by', 'user_request'
  )
);