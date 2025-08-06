-- Insert a record for the previous successful pipeline execution
INSERT INTO pipeline_executions (
  id,
  execution_type,
  status,
  created_at,
  started_at,
  completed_at,
  batch_size,
  processed_count,
  success_count,
  failure_count,
  metrics
) VALUES (
  gen_random_uuid(),
  'full_pipeline',
  'completed',
  now() - interval '2 hours',
  now() - interval '2 hours',
  now() - interval '1 hour',
  53,
  53,
  43,
  10,
  jsonb_build_object(
    'pages_scraped', 53,
    'subsidies_extracted', 43,
    'forms_generated', 12,
    'processing_success_rate', 81,
    'countries_processed', array['france', 'romania']
  )
);