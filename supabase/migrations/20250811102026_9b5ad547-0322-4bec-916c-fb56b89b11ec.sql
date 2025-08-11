-- Create Phase D analytics view for monitoring and dashboards
CREATE OR REPLACE VIEW phase_d_extractions AS
SELECT
  id,
  document_id,
  status,
  created_at,
  updated_at,
  confidence_score,
  (table_data->'metadata'->>'extractionMethod') as extraction_method,
  (table_data->'metadata'->>'aiModel') as ai_model,
  (table_data->'metadata'->>'version') as version,
  (table_data->'metadata'->>'totalTables')::int as total_tables,
  (table_data->'metadata'->>'successfulTables')::int as successful_tables,
  (table_data->'metadata'->>'subsidyFieldsFound')::int as subsidy_fields_found,
  (table_data->'metadata'->>'totalTokensUsed')::int as total_tokens_used,
  (table_data->'metadata'->>'extractionTime')::int as extraction_time_ms,
  (table_data->'metadata'->>'postProcessingTime')::int as post_processing_time_ms,
  (table_data->'metadata'->>'totalProcessingTime')::int as total_processing_time_ms,
  table_count,
  table_quality,
  tables_extracted,
  -- Additional computed fields for analytics
  CASE 
    WHEN table_quality >= 0.8 THEN 'high'
    WHEN table_quality >= 0.5 THEN 'medium'
    ELSE 'low'
  END as quality_tier,
  CASE 
    WHEN (table_data->'metadata'->>'subsidyFieldsFound')::int > 0 THEN true
    ELSE false
  END as has_subsidy_data,
  CASE 
    WHEN status = 'completed' AND (tables_extracted)::boolean = true AND COALESCE(table_count, 0) > 0 THEN 'success'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'partial'
  END as extraction_outcome
FROM document_extractions
WHERE table_data->'metadata'->>'extractionMethod' = 'phase-d-advanced';

-- Create optimized index for Phase D queries
CREATE INDEX IF NOT EXISTS idx_extractions_phase_d_optimized
ON document_extractions ((table_data->'metadata'->>'extractionMethod'), created_at DESC)
WHERE table_data->'metadata'->>'extractionMethod' = 'phase-d-advanced';

-- Create summary stats view for dashboards
CREATE OR REPLACE VIEW phase_d_stats_daily AS
SELECT
  DATE(created_at) as extraction_date,
  COUNT(*) as total_extractions,
  COUNT(*) FILTER (WHERE extraction_outcome = 'success') as successful_extractions,
  COUNT(*) FILTER (WHERE extraction_outcome = 'failed') as failed_extractions,
  COUNT(*) FILTER (WHERE has_subsidy_data = true) as extractions_with_subsidies,
  AVG(table_quality) as avg_table_quality,
  AVG(total_processing_time_ms) as avg_processing_time_ms,
  SUM(total_tokens_used) as total_tokens_consumed,
  AVG(total_tables) as avg_tables_per_doc,
  AVG(subsidy_fields_found) as avg_subsidy_fields_per_doc
FROM phase_d_extractions
GROUP BY DATE(created_at)
ORDER BY extraction_date DESC;

-- Grant appropriate permissions
GRANT SELECT ON phase_d_extractions TO authenticated;
GRANT SELECT ON phase_d_stats_daily TO authenticated;

-- Add helpful comments
COMMENT ON VIEW phase_d_extractions IS 'Detailed view of Phase D table extractions with computed analytics fields';
COMMENT ON VIEW phase_d_stats_daily IS 'Daily aggregated statistics for Phase D extraction performance monitoring';
COMMENT ON INDEX idx_extractions_phase_d_optimized IS 'Optimized index for Phase D analytics queries and dashboards';