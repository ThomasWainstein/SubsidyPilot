-- PURGE ALL TEST/FAKE SUBSIDIES
-- Identify test data by: NULL agency, NULL source_url, and specific created_at timestamp

DELETE FROM public.subsidies 
WHERE agency IS NULL 
  AND source_url IS NULL 
  AND created_at = '2025-05-31 16:48:33.076003+00';

-- Log the purge operation
INSERT INTO public.scraper_logs (session_id, status, message, details)
VALUES (
  'PURGE_' || extract(epoch from now())::text,
  'completed',
  'Test subsidies purged from database',
  jsonb_build_object(
    'action', 'DELETE_TEST_SUBSIDIES',
    'timestamp', now(),
    'criteria', 'agency IS NULL AND source_url IS NULL AND created_at = 2025-05-31'
  )
);