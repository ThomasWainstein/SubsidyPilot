-- Fix remaining RLS performance warnings by wrapping auth function calls in subselects
-- This addresses the auth_rls_initplan warnings by preventing per-row evaluation

-- application_form_instances
DROP POLICY IF EXISTS "Service role can manage form instances" ON public.application_form_instances;
CREATE POLICY "Service role can manage form instances"
ON public.application_form_instances
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- application_forms  
DROP POLICY IF EXISTS "Authenticated users can view application forms" ON public.application_forms;
CREATE POLICY "Authenticated users can view application forms"
ON public.application_forms
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage application forms" ON public.application_forms;
CREATE POLICY "Service role can manage application forms"
ON public.application_forms
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- application_sessions
DROP POLICY IF EXISTS "Users can manage their own application sessions" ON public.application_sessions;
CREATE POLICY "Users can manage their own application sessions"
ON public.application_sessions
FOR ALL
TO public
USING (
  (user_id = (SELECT auth.uid())) OR 
  ((farm_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = application_sessions.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )))
)
WITH CHECK (
  (user_id = (SELECT auth.uid())) OR 
  ((farm_id IS NOT NULL) AND (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = application_sessions.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )))
);

-- applications
DROP POLICY IF EXISTS "applications_delete" ON public.applications;
CREATE POLICY "applications_delete"
ON public.applications
FOR DELETE
TO public
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "applications_insert" ON public.applications;
CREATE POLICY "applications_insert"
ON public.applications
FOR INSERT
TO public
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "applications_select" ON public.applications;
CREATE POLICY "applications_select"
ON public.applications
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "applications_update" ON public.applications;
CREATE POLICY "applications_update"
ON public.applications
FOR UPDATE
TO public
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = applications.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

-- content_change_log
DROP POLICY IF EXISTS "Authenticated users can view change log" ON public.content_change_log;
CREATE POLICY "Authenticated users can view change log"
ON public.content_change_log
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage change log" ON public.content_change_log;
CREATE POLICY "Service role can manage change log"
ON public.content_change_log
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- content_versions
DROP POLICY IF EXISTS "Authenticated users can view content versions" ON public.content_versions;
CREATE POLICY "Authenticated users can view content versions"
ON public.content_versions
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage content versions" ON public.content_versions;
CREATE POLICY "Service role can manage content versions"
ON public.content_versions
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- crawl_events
DROP POLICY IF EXISTS "Authenticated users can view crawl events" ON public.crawl_events;
CREATE POLICY "Authenticated users can view crawl events"
ON public.crawl_events
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage crawl events" ON public.crawl_events;
CREATE POLICY "Service role can manage crawl events"
ON public.crawl_events
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- document_classification_logs
DROP POLICY IF EXISTS "Service role can manage classification logs" ON public.document_classification_logs;
CREATE POLICY "Service role can manage classification logs"
ON public.document_classification_logs
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can view classification logs for their documents" ON public.document_classification_logs;
CREATE POLICY "Users can view classification logs for their documents"
ON public.document_classification_logs
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM farm_documents fd
  JOIN farms f ON fd.farm_id = f.id
  WHERE fd.id = document_classification_logs.document_id 
  AND f.user_id = (SELECT auth.uid())
));

-- document_extraction_reviews
DROP POLICY IF EXISTS "Service role can manage extraction reviews" ON public.document_extraction_reviews;
CREATE POLICY "Service role can manage extraction reviews"
ON public.document_extraction_reviews
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can create reviews for their documents" ON public.document_extraction_reviews;
CREATE POLICY "Users can create reviews for their documents"
ON public.document_extraction_reviews
FOR INSERT
TO public
WITH CHECK (EXISTS (
  SELECT 1 FROM document_extractions de
  JOIN farm_documents fd ON de.document_id = fd.id
  JOIN farms f ON fd.farm_id = f.id
  WHERE de.id = document_extraction_reviews.extraction_id 
  AND f.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "Users can view reviews for their documents" ON public.document_extraction_reviews;
CREATE POLICY "Users can view reviews for their documents"
ON public.document_extraction_reviews
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM document_extractions de
  JOIN farm_documents fd ON de.document_id = fd.id
  JOIN farms f ON fd.farm_id = f.id
  WHERE de.id = document_extraction_reviews.extraction_id 
  AND f.user_id = (SELECT auth.uid())
));

-- document_extraction_status
DROP POLICY IF EXISTS "Service role can manage extraction status" ON public.document_extraction_status;
CREATE POLICY "Service role can manage extraction status"
ON public.document_extraction_status
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can view extraction status" ON public.document_extraction_status;
CREATE POLICY "Users can view extraction status"
ON public.document_extraction_status
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

-- document_extractions
DROP POLICY IF EXISTS "Users can view extractions for their documents" ON public.document_extractions;
CREATE POLICY "Users can view extractions for their documents"
ON public.document_extractions
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM farm_documents fd
  JOIN farms f ON fd.farm_id = f.id
  WHERE fd.id = document_extractions.document_id 
  AND f.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "document_extractions_user_access" ON public.document_extractions;
CREATE POLICY "document_extractions_user_access"
ON public.document_extractions
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM farm_documents fd
  JOIN farms f ON fd.farm_id = f.id
  WHERE fd.id = document_extractions.document_id 
  AND f.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "service_role_extractions_insert" ON public.document_extractions;
CREATE POLICY "service_role_extractions_insert"
ON public.document_extractions
FOR INSERT
TO public
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "service_role_extractions_update" ON public.document_extractions;
CREATE POLICY "service_role_extractions_update"
ON public.document_extractions
FOR UPDATE
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- document_subsidy_mappings
DROP POLICY IF EXISTS "Authenticated users can view document mappings" ON public.document_subsidy_mappings;
CREATE POLICY "Authenticated users can view document mappings"
ON public.document_subsidy_mappings
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage document mappings" ON public.document_subsidy_mappings;
CREATE POLICY "Service role can manage document mappings"
ON public.document_subsidy_mappings
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- error_log
DROP POLICY IF EXISTS "Service role can manage error_log" ON public.error_log;
CREATE POLICY "Service role can manage error_log"
ON public.error_log
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- extraction_batches
DROP POLICY IF EXISTS "Service role can manage all batches" ON public.extraction_batches;
CREATE POLICY "Service role can manage all batches"
ON public.extraction_batches
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can create their own batches" ON public.extraction_batches;
CREATE POLICY "Users can create their own batches"
ON public.extraction_batches
FOR INSERT
TO public
WITH CHECK (
  (owner_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Users can view their own batches" ON public.extraction_batches;
CREATE POLICY "Users can view their own batches"
ON public.extraction_batches
FOR SELECT
TO public
USING (
  (owner_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

-- extraction_qa_results
DROP POLICY IF EXISTS "Service role can manage QA results" ON public.extraction_qa_results;
CREATE POLICY "Service role can manage QA results"
ON public.extraction_qa_results
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can view QA results" ON public.extraction_qa_results;
CREATE POLICY "Users can view QA results"
ON public.extraction_qa_results
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

-- extraction_queue
DROP POLICY IF EXISTS "Authenticated users can view extraction queue" ON public.extraction_queue;
CREATE POLICY "Authenticated users can view extraction queue"
ON public.extraction_queue
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage extraction queue" ON public.extraction_queue;
CREATE POLICY "Service role can manage extraction queue"
ON public.extraction_queue
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- farm_documents
DROP POLICY IF EXISTS "farm_documents_delete" ON public.farm_documents;
CREATE POLICY "farm_documents_delete"
ON public.farm_documents
FOR DELETE
TO public
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "farm_documents_insert" ON public.farm_documents;
CREATE POLICY "farm_documents_insert"
ON public.farm_documents
FOR INSERT
TO public
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "farm_documents_select" ON public.farm_documents;
CREATE POLICY "farm_documents_select"
ON public.farm_documents
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "farm_documents_update" ON public.farm_documents;
CREATE POLICY "farm_documents_update"
ON public.farm_documents
FOR UPDATE
TO public
USING (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = (SELECT auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM farms
  WHERE farms.id = farm_documents.farm_id 
  AND farms.user_id = (SELECT auth.uid())
));

-- farms
DROP POLICY IF EXISTS "farms_delete" ON public.farms;
CREATE POLICY "farms_delete"
ON public.farms
FOR DELETE
TO public
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "farms_insert" ON public.farms;
CREATE POLICY "farms_insert"
ON public.farms
FOR INSERT
TO public
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "farms_select" ON public.farms;
CREATE POLICY "farms_select"
ON public.farms
FOR SELECT
TO public
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "farms_update" ON public.farms;
CREATE POLICY "farms_update"
ON public.farms
FOR UPDATE
TO public
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- field_corrections
DROP POLICY IF EXISTS "Users can create corrections for their documents" ON public.field_corrections;
CREATE POLICY "Users can create corrections for their documents"
ON public.field_corrections
FOR INSERT
TO public
WITH CHECK (EXISTS (
  SELECT 1 FROM farm_documents fd
  JOIN farms f ON fd.farm_id = f.id
  WHERE fd.id = field_corrections.document_id 
  AND f.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "Users can view corrections for their documents" ON public.field_corrections;
CREATE POLICY "Users can view corrections for their documents"
ON public.field_corrections
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM farm_documents fd
  JOIN farms f ON fd.farm_id = f.id
  WHERE fd.id = field_corrections.document_id 
  AND f.user_id = (SELECT auth.uid())
));

-- integration_audit_log
DROP POLICY IF EXISTS "Authenticated users can view audit log" ON public.integration_audit_log;
CREATE POLICY "Authenticated users can view audit log"
ON public.integration_audit_log
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage audit log" ON public.integration_audit_log;
CREATE POLICY "Service role can manage audit log"
ON public.integration_audit_log
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- model_deployments
DROP POLICY IF EXISTS "Service role can manage deployments" ON public.model_deployments;
CREATE POLICY "Service role can manage deployments"
ON public.model_deployments
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can view deployments for their training jobs" ON public.model_deployments;
CREATE POLICY "Users can view deployments for their training jobs"
ON public.model_deployments
FOR SELECT
TO public
USING (EXISTS (
  SELECT 1 FROM model_training_jobs mtj
  LEFT JOIN farms f ON mtj.farm_id = f.id
  WHERE mtj.id = model_deployments.training_job_id 
  AND (mtj.farm_id IS NULL OR f.user_id = (SELECT auth.uid()))
));

-- model_training_jobs
DROP POLICY IF EXISTS "Service role can manage training jobs" ON public.model_training_jobs;
CREATE POLICY "Service role can manage training jobs"
ON public.model_training_jobs
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Users can view training jobs for their farms" ON public.model_training_jobs;
CREATE POLICY "Users can view training jobs for their farms"
ON public.model_training_jobs
FOR SELECT
TO public
USING (
  (farm_id IS NULL) OR 
  (EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = model_training_jobs.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  ))
);

-- parsing_profiles
DROP POLICY IF EXISTS "Authenticated users can view parsing profiles" ON public.parsing_profiles;
CREATE POLICY "Authenticated users can view parsing profiles"
ON public.parsing_profiles
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage parsing profiles" ON public.parsing_profiles;
CREATE POLICY "Service role can manage parsing profiles"
ON public.parsing_profiles
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- pipeline_executions
DROP POLICY IF EXISTS "Authenticated users can view pipeline executions" ON public.pipeline_executions;
CREATE POLICY "Authenticated users can view pipeline executions"
ON public.pipeline_executions
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage pipeline executions" ON public.pipeline_executions;
CREATE POLICY "Service role can manage pipeline executions"
ON public.pipeline_executions
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- quality_metrics
DROP POLICY IF EXISTS "Authenticated users can view quality metrics" ON public.quality_metrics;
CREATE POLICY "Authenticated users can view quality metrics"
ON public.quality_metrics
FOR SELECT
TO public
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage quality metrics" ON public.quality_metrics;
CREATE POLICY "Service role can manage quality metrics"
ON public.quality_metrics
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- raw_logs
DROP POLICY IF EXISTS "Service role can manage raw_logs" ON public.raw_logs;
CREATE POLICY "Service role can manage raw_logs"
ON public.raw_logs
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- raw_scraped_pages
DROP POLICY IF EXISTS "Authenticated users can view raw scraped pages" ON public.raw_scraped_pages;
CREATE POLICY "Authenticated users can view raw scraped pages"
ON public.raw_scraped_pages
FOR SELECT
TO public
USING ((SELECT auth.role()) = ANY (ARRAY['authenticated'::text, 'service_role'::text]));

DROP POLICY IF EXISTS "Service role can manage raw scraped pages" ON public.raw_scraped_pages;
CREATE POLICY "Service role can manage raw scraped pages"
ON public.raw_scraped_pages
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- review_assignments
DROP POLICY IF EXISTS "Authenticated users can view their own assignments" ON public.review_assignments;
CREATE POLICY "Authenticated users can view their own assignments"
ON public.review_assignments
FOR SELECT
TO public
USING (
  (assigned_to = (SELECT auth.uid())) OR 
  (assigned_by = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Reviewers can update their assignments" ON public.review_assignments;
CREATE POLICY "Reviewers can update their assignments"
ON public.review_assignments
FOR UPDATE
TO public
USING (
  (assigned_to = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
)
WITH CHECK (
  (assigned_to = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Service role can manage all assignments" ON public.review_assignments;
CREATE POLICY "Service role can manage all assignments"
ON public.review_assignments
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- review_decisions
DROP POLICY IF EXISTS "Reviewers can insert their decisions" ON public.review_decisions;
CREATE POLICY "Reviewers can insert their decisions"
ON public.review_decisions
FOR INSERT
TO public
WITH CHECK (
  (reviewer_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Reviewers can view their decisions" ON public.review_decisions;
CREATE POLICY "Reviewers can view their decisions"
ON public.review_decisions
FOR SELECT
TO public
USING (
  (reviewer_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role') OR 
  (EXISTS (
    SELECT 1 FROM review_assignments ra
    WHERE ra.id = review_decisions.assignment_id 
    AND (
      (ra.assigned_to = (SELECT auth.uid())) OR 
      (ra.assigned_by = (SELECT auth.uid()))
    )
  ))
);

DROP POLICY IF EXISTS "Service role can manage all decisions" ON public.review_decisions;
CREATE POLICY "Service role can manage all decisions"
ON public.review_decisions
FOR ALL
TO public
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');