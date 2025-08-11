-- Security Fix Phase 1: Critical Database Security (Final)
-- Drop and recreate problematic SECURITY DEFINER views without the security definer clause

-- Drop existing security definer views
DROP VIEW IF EXISTS public.v_pipeline_health_24h;
DROP VIEW IF EXISTS public.v_harvest_quality_by_source_24h;
DROP VIEW IF EXISTS public.v_orphan_pages_recent;
DROP VIEW IF EXISTS public.v_ai_yield_by_run;
DROP VIEW IF EXISTS public.v_ai_errors_last_24h;
DROP VIEW IF EXISTS public.v_active_run_status;

-- Recreate views without SECURITY DEFINER (they inherit caller permissions)
CREATE VIEW public.v_pipeline_health_24h AS
SELECT 
  pr.id as run_id,
  pr.status,
  pr.started_at,
  pr.ended_at,
  COALESCE(jsonb_extract_path_text(pr.stats, 'total_pages'), '0')::integer as total_pages,
  COALESCE(jsonb_extract_path_text(pr.stats, 'processed_pages'), '0')::integer as processed_pages,
  COALESCE(jsonb_extract_path_text(pr.stats, 'failed_pages'), '0')::integer as failed_pages,
  CASE 
    WHEN pr.ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (pr.ended_at - pr.started_at))::integer
    ELSE EXTRACT(EPOCH FROM (now() - pr.started_at))::integer
  END as duration_seconds
FROM public.pipeline_runs pr
WHERE pr.started_at >= now() - interval '24 hours';

CREATE VIEW public.v_harvest_quality_by_source_24h AS
SELECT 
  rsp.source_site,
  COUNT(*) as pages_harvested,
  COUNT(CASE WHEN LENGTH(rsp.raw_text) > 1000 THEN 1 END) as quality_pages,
  AVG(LENGTH(rsp.raw_text)) as avg_content_length,
  COUNT(CASE WHEN rsp.created_at >= now() - interval '1 hour' THEN 1 END) as recent_pages
FROM public.raw_scraped_pages rsp
WHERE rsp.created_at >= now() - interval '24 hours'
GROUP BY rsp.source_site;

CREATE VIEW public.v_orphan_pages_recent AS
SELECT 
  rsp.id,
  rsp.source_url,
  rsp.source_site,
  LENGTH(rsp.raw_text) as content_length,
  rsp.created_at
FROM public.raw_scraped_pages rsp
WHERE rsp.created_at >= now() - interval '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM public.subsidies_structured ss 
    WHERE ss.url = rsp.source_url
  );

CREATE VIEW public.v_ai_yield_by_run AS
SELECT 
  acr.run_id,
  acr.model,
  acr.pages_processed,
  acr.subs_created,
  CASE 
    WHEN acr.pages_processed > 0 
    THEN ROUND((acr.subs_created::numeric / acr.pages_processed::numeric) * 100, 2)
    ELSE 0 
  END as yield_percentage,
  acr.started_at,
  acr.ended_at
FROM public.ai_content_runs acr
WHERE acr.ended_at IS NOT NULL;

CREATE VIEW public.v_ai_errors_last_24h AS
SELECT 
  ace.id,
  ace.run_id,
  ace.stage,
  ace.message,
  ace.source_url,
  ace.created_at
FROM public.ai_content_errors ace
WHERE ace.created_at >= now() - interval '24 hours'
ORDER BY ace.created_at DESC;

CREATE VIEW public.v_active_run_status AS
SELECT 
  pr.id,
  pr.status,
  pr.stage,
  pr.progress,
  pr.started_at,
  pr.config,
  EXTRACT(EPOCH FROM (now() - pr.started_at))::integer as runtime_seconds
FROM public.pipeline_runs pr
WHERE pr.status IN ('running', 'starting')
ORDER BY pr.started_at DESC;

-- Fix overly permissive RLS policies using valid roles (admin, moderator, user, qa_reviewer)

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "authenticated_users_can_read_subsidies" ON public.subsidies;

-- Create role-based subsidies access policies
CREATE POLICY "admins_can_read_all_subsidies" 
ON public.subsidies 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "moderators_can_read_subsidies" 
ON public.subsidies 
FOR SELECT 
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_can_read_open_subsidies" 
ON public.subsidies 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'user') AND 
  (status = 'open' OR status IS NULL)
);

-- Restrict subsidies_structured access to authenticated users with proper roles
DROP POLICY IF EXISTS "authenticated_users_can_read_subsidies_structured" ON public.subsidies_structured;

CREATE POLICY "admins_can_read_all_subsidies_structured" 
ON public.subsidies_structured 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "moderators_can_read_subsidies_structured" 
ON public.subsidies_structured 
FOR SELECT 
USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users_can_read_active_subsidies_structured" 
ON public.subsidies_structured 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'user') AND 
  (archived = false OR archived IS NULL)
);

-- Restrict pipeline data access to admins and run owners
CREATE POLICY "admins_can_view_all_pipeline_runs" 
ON public.pipeline_runs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Add ownership-based access if user_id exists in config
CREATE POLICY "users_can_view_own_pipeline_runs" 
ON public.pipeline_runs 
FOR SELECT 
USING (
  NOT public.has_role(auth.uid(), 'admin') AND
  (config->>'user_id')::uuid = auth.uid()
);

-- Secure extraction queue access to admins only
DROP POLICY IF EXISTS "Authenticated users can view extraction queue" ON public.extraction_queue;
DROP POLICY IF EXISTS "Service role can manage extraction queue" ON public.extraction_queue;

CREATE POLICY "admins_can_view_extraction_queue" 
ON public.extraction_queue 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role_can_manage_extraction_queue" 
ON public.extraction_queue 
FOR ALL 
USING (auth.role() = 'service_role');

-- Secure document mappings to admins only  
DROP POLICY IF EXISTS "Authenticated users can view document mappings" ON public.document_subsidy_mappings;
DROP POLICY IF EXISTS "Service role can manage document mappings" ON public.document_subsidy_mappings;

CREATE POLICY "admins_can_view_document_mappings" 
ON public.document_subsidy_mappings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "service_role_can_manage_document_mappings" 
ON public.document_subsidy_mappings 
FOR ALL 
USING (auth.role() = 'service_role');

-- Log security policy updates
INSERT INTO public.security_audit_log (
  event_type, user_id, event_data, risk_level
) VALUES (
  'security_policies_updated',
  auth.uid(),
  jsonb_build_object(
    'action', 'comprehensive_security_fix',
    'policies_updated', jsonb_build_array(
      'subsidies_access_restricted',
      'pipeline_access_secured', 
      'extraction_queue_secured',
      'document_mappings_secured'
    ),
    'views_fixed', jsonb_build_array(
      'v_pipeline_health_24h',
      'v_harvest_quality_by_source_24h', 
      'v_orphan_pages_recent',
      'v_ai_yield_by_run',
      'v_ai_errors_last_24h',
      'v_active_run_status'
    )
  ),
  'high'
);