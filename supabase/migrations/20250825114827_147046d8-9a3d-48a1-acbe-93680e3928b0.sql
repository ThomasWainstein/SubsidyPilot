-- SECURITY FIX Phase 2: Protect remaining operational and business data

-- Protect scrape_runs - operational data that reveals data collection patterns
DROP POLICY IF EXISTS "Authenticated users can view scrape runs" ON public.scrape_runs;
DROP POLICY IF EXISTS "Everyone can view scrape runs" ON public.scrape_runs;
DROP POLICY IF EXISTS "Anyone can view scrape runs" ON public.scrape_runs;
CREATE POLICY "Admins can view scrape runs" ON public.scrape_runs
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

-- Protect pipeline_runs - internal processing operations
DROP POLICY IF EXISTS "Authenticated users can view pipeline runs" ON public.pipeline_runs;
DROP POLICY IF EXISTS "Everyone can view pipeline runs" ON public.pipeline_runs;
DROP POLICY IF EXISTS "Anyone can view pipeline runs" ON public.pipeline_runs;
CREATE POLICY "Admins can view pipeline runs" ON public.pipeline_runs
    FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role');

-- Log additional security fixes
INSERT INTO public.user_actions (
    user_id, 
    action_type, 
    resource_type, 
    action_data, 
    triggered_by
) VALUES (
    NULL,
    'security_fix_applied',
    'rls_policies', 
    jsonb_build_object(
        'description', 'Protected operational data from public access',
        'tables_affected', ARRAY['scrape_runs', 'pipeline_runs'],
        'access_level', 'admin_only',
        'timestamp', now()
    ),
    'security_audit_phase2'
);