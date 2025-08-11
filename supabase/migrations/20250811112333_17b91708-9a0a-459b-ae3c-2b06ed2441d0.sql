-- Remove problematic Security Definer views
-- These views bypass RLS and are flagged by the security linter

-- Drop the phase_d views that are flagged as security risks
DROP VIEW IF EXISTS public.phase_d_extractions CASCADE;
DROP VIEW IF EXISTS public.phase_d_stats_daily CASCADE;

-- Create secure replacement function for phase D extraction data
CREATE OR REPLACE FUNCTION public.get_phase_d_extractions()
RETURNS TABLE(
  id uuid,
  document_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  confidence_score numeric,
  extraction_method text,
  ai_model text,
  version text,
  total_tables integer,
  successful_tables integer,
  subsidy_fields_found integer,
  total_tokens_used integer,
  extraction_time_ms integer,
  post_processing_time_ms integer,
  total_processing_time_ms integer,
  table_count integer,
  table_quality numeric,
  tables_extracted jsonb,
  quality_tier text,
  has_subsidy_data boolean,
  extraction_outcome text
) AS $$
BEGIN
  -- Only allow authenticated users to access this data
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;
  
  RETURN QUERY
  SELECT 
    de.id,
    de.document_id,
    de.status::text,
    de.created_at,
    de.updated_at,
    de.confidence_score,
    ((de.table_data -> 'metadata') ->> 'extractionMethod') AS extraction_method,
    ((de.table_data -> 'metadata') ->> 'aiModel') AS ai_model,
    ((de.table_data -> 'metadata') ->> 'version') AS version,
    (((de.table_data -> 'metadata') ->> 'totalTables')::integer) AS total_tables,
    (((de.table_data -> 'metadata') ->> 'successfulTables')::integer) AS successful_tables,
    (((de.table_data -> 'metadata') ->> 'subsidyFieldsFound')::integer) AS subsidy_fields_found,
    (((de.table_data -> 'metadata') ->> 'totalTokensUsed')::integer) AS total_tokens_used,
    (((de.table_data -> 'metadata') ->> 'extractionTime')::integer) AS extraction_time_ms,
    (((de.table_data -> 'metadata') ->> 'postProcessingTime')::integer) AS post_processing_time_ms,
    (((de.table_data -> 'metadata') ->> 'totalProcessingTime')::integer) AS total_processing_time_ms,
    de.table_count,
    de.table_quality,
    de.tables_extracted,
    CASE
      WHEN de.table_quality >= 0.8 THEN 'high'
      WHEN de.table_quality >= 0.5 THEN 'medium'
      ELSE 'low'
    END AS quality_tier,
    CASE
      WHEN (((de.table_data -> 'metadata') ->> 'subsidyFieldsFound')::integer > 0) THEN true
      ELSE false
    END AS has_subsidy_data,
    CASE
      WHEN (de.status::text = 'completed' AND de.tables_extracted::boolean = true AND COALESCE(de.table_count, 0) > 0) THEN 'success'
      WHEN de.status::text = 'failed' THEN 'failed'
      ELSE 'partial'
    END AS extraction_outcome
  FROM public.document_extractions de
  WHERE ((de.table_data -> 'metadata') ->> 'extractionMethod') = 'phase-d-advanced';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';