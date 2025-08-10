-- Fix RLS performance issues by optimizing auth function calls
-- Replace auth.<function>() with (select auth.<function>()) to avoid re-evaluation per row

-- Fix document_classification_logs policies
DROP POLICY IF EXISTS "Service role can manage classification logs" ON public.document_classification_logs;
CREATE POLICY "Service role can manage classification logs" 
ON public.document_classification_logs
FOR ALL
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- Fix model_deployments policies
DROP POLICY IF EXISTS "Service role can manage deployments" ON public.model_deployments;
CREATE POLICY "Service role can manage deployments" 
ON public.model_deployments
FOR ALL
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Users can view deployments for their training jobs" ON public.model_deployments;
CREATE POLICY "Users can view deployments for their training jobs" 
ON public.model_deployments
FOR SELECT
USING (EXISTS ( 
    SELECT 1
    FROM (model_training_jobs mtj
        LEFT JOIN farms f ON ((mtj.id = model_deployments.training_job_id)))
    WHERE ((mtj.id = model_deployments.training_job_id) AND ((mtj.farm_id IS NULL) OR (f.user_id = (SELECT auth.uid()))))
));

-- Fix error_log policies
DROP POLICY IF EXISTS "Service role can manage error_log" ON public.error_log;
CREATE POLICY "Service role can manage error_log" 
ON public.error_log
FOR ALL
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- Fix field_corrections policies
DROP POLICY IF EXISTS "Users can view corrections for their documents" ON public.field_corrections;
CREATE POLICY "Users can view corrections for their documents" 
ON public.field_corrections
FOR SELECT
USING (EXISTS ( 
    SELECT 1
    FROM (farm_documents fd
        JOIN farms f ON ((fd.farm_id = f.id)))
    WHERE ((fd.id = field_corrections.document_id) AND (f.user_id = (SELECT auth.uid())))
));

DROP POLICY IF EXISTS "Users can create corrections for their documents" ON public.field_corrections;
CREATE POLICY "Users can create corrections for their documents" 
ON public.field_corrections
FOR INSERT
WITH CHECK (EXISTS ( 
    SELECT 1
    FROM (farm_documents fd
        JOIN farms f ON ((fd.farm_id = f.id)))
    WHERE ((fd.id = field_corrections.document_id) AND (f.user_id = (SELECT auth.uid())))
));

-- Fix subsidy_form_schemas policies (if the table exists)
DROP POLICY IF EXISTS "Service role can manage form schemas" ON public.subsidy_form_schemas;
CREATE POLICY "Service role can manage form schemas" 
ON public.subsidy_form_schemas
FOR ALL
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

-- Fix raw_scraped_pages policies
DROP POLICY IF EXISTS "Service role can manage raw scraped pages" ON public.raw_scraped_pages;
CREATE POLICY "Service role can manage raw scraped pages" 
ON public.raw_scraped_pages
FOR ALL
USING ((SELECT auth.role()) = 'service_role'::text)
WITH CHECK ((SELECT auth.role()) = 'service_role'::text);

DROP POLICY IF EXISTS "Authenticated users can view raw scraped pages" ON public.raw_scraped_pages;
CREATE POLICY "Authenticated users can view raw scraped pages" 
ON public.raw_scraped_pages
FOR SELECT
USING ((SELECT auth.role()) = ANY (ARRAY['authenticated'::text, 'service_role'::text]));