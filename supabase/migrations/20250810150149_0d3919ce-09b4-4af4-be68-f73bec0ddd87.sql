-- Fix all RLS performance warnings by wrapping auth calls in subselects
-- This addresses the 247 auth_rls_initplan warnings

-- 1) user_profiles policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_profiles_self_access ON public.user_profiles;
CREATE POLICY user_profiles_self_access
ON public.user_profiles
USING (user_id = (SELECT auth.uid()));

-- 2) subsidy_applications policies
ALTER TABLE public.subsidy_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own applications" ON public.subsidy_applications;
CREATE POLICY "Users can view their own applications"
ON public.subsidy_applications
FOR SELECT
USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create their own applications" ON public.subsidy_applications;
CREATE POLICY "Users can create their own applications"
ON public.subsidy_applications
FOR INSERT
WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own applications" ON public.subsidy_applications;
CREATE POLICY "Users can update their own applications"
ON public.subsidy_applications
FOR UPDATE
USING (owner_id = (SELECT auth.uid()))
WITH CHECK (owner_id = (SELECT auth.uid()));

-- 3) document_extractions policies
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view extractions for their documents" ON public.document_extractions;
CREATE POLICY "Users can view extractions for their documents"
ON public.document_extractions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farm_documents fd
    JOIN farms f ON fd.farm_id = f.id
    WHERE fd.id = document_extractions.document_id
      AND f.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS document_extractions_user_access ON public.document_extractions;
CREATE POLICY document_extractions_user_access
ON public.document_extractions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farm_documents fd
    JOIN farms f ON fd.farm_id = f.id
    WHERE fd.id = document_extractions.document_id
      AND f.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS service_role_extractions_insert ON public.document_extractions;
CREATE POLICY service_role_extractions_insert
ON public.document_extractions
FOR INSERT
WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS service_role_extractions_update ON public.document_extractions;
CREATE POLICY service_role_extractions_update
ON public.document_extractions
FOR UPDATE
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 4) document_extraction_reviews policies
ALTER TABLE public.document_extraction_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reviews for their documents" ON public.document_extraction_reviews;
CREATE POLICY "Users can create reviews for their documents"
ON public.document_extraction_reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM document_extractions de
    JOIN farm_documents fd ON de.document_id = fd.id
    JOIN farms f ON fd.farm_id = f.id
    WHERE de.id = document_extraction_reviews.extraction_id
      AND f.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can view reviews for their documents" ON public.document_extraction_reviews;
CREATE POLICY "Users can view reviews for their documents"
ON public.document_extraction_reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM document_extractions de
    JOIN farm_documents fd ON de.document_id = fd.id
    JOIN farms f ON fd.farm_id = f.id
    WHERE de.id = document_extraction_reviews.extraction_id
      AND f.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Service role can manage extraction reviews" ON public.document_extraction_reviews;
CREATE POLICY "Service role can manage extraction reviews"
ON public.document_extraction_reviews
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 5) subsidies_structured policies (also clean up public exposure)
ALTER TABLE public.subsidies_structured ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view subsidies_structured" ON public.subsidies_structured;

DROP POLICY IF EXISTS authenticated_users_can_read_subsidies ON public.subsidies_structured;
CREATE POLICY authenticated_users_can_read_subsidies
ON public.subsidies_structured
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Service role can manage subsidies_structured" ON public.subsidies_structured;
CREATE POLICY "Service role can manage subsidies_structured"
ON public.subsidies_structured
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin users can update subsidies_structured" ON public.subsidies_structured;
CREATE POLICY "Admin users can update subsidies_structured"
ON public.subsidies_structured
FOR UPDATE
USING ((SELECT auth.role()) = 'admin')
WITH CHECK ((SELECT auth.role()) = 'admin');

DROP POLICY IF EXISTS "Admin users can delete subsidies_structured" ON public.subsidies_structured;
CREATE POLICY "Admin users can delete subsidies_structured"
ON public.subsidies_structured
FOR DELETE
USING ((SELECT auth.role()) = 'admin');

-- 6) raw_logs policies
ALTER TABLE public.raw_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage raw_logs" ON public.raw_logs;
CREATE POLICY "Service role can manage raw_logs"
ON public.raw_logs
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 7) model_training_jobs policies
ALTER TABLE public.model_training_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view training jobs for their farms" ON public.model_training_jobs;
CREATE POLICY "Users can view training jobs for their farms"
ON public.model_training_jobs
FOR SELECT
USING (
  (farm_id IS NULL) OR 
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = model_training_jobs.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Service role can manage training jobs" ON public.model_training_jobs;
CREATE POLICY "Service role can manage training jobs"
ON public.model_training_jobs
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 8) document_classification_logs policies
ALTER TABLE public.document_classification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view classification logs for their documents" ON public.document_classification_logs;
CREATE POLICY "Users can view classification logs for their documents"
ON public.document_classification_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farm_documents fd
    JOIN farms f ON fd.farm_id = f.id
    WHERE fd.id = document_classification_logs.document_id
      AND f.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Service role can manage classification logs" ON public.document_classification_logs;
CREATE POLICY "Service role can manage classification logs"
ON public.document_classification_logs
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 9) document_extraction_status policies
ALTER TABLE public.document_extraction_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view extraction status" ON public.document_extraction_status;
CREATE POLICY "Users can view extraction status"
ON public.document_extraction_status
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage extraction status" ON public.document_extraction_status;
CREATE POLICY "Service role can manage extraction status"
ON public.document_extraction_status
FOR ALL
USING ((SELECT auth.role()) = 'service_role');

-- 10) extraction_qa_results policies
ALTER TABLE public.extraction_qa_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view QA results" ON public.extraction_qa_results;
CREATE POLICY "Users can view QA results"
ON public.extraction_qa_results
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage QA results" ON public.extraction_qa_results;
CREATE POLICY "Service role can manage QA results"
ON public.extraction_qa_results
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 11) pipeline_executions policies
ALTER TABLE public.pipeline_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view pipeline executions" ON public.pipeline_executions;
CREATE POLICY "Authenticated users can view pipeline executions"
ON public.pipeline_executions
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage pipeline executions" ON public.pipeline_executions;
CREATE POLICY "Service role can manage pipeline executions"
ON public.pipeline_executions
FOR ALL
USING ((SELECT auth.role()) = 'service_role');

-- 12) quality_metrics policies
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view quality metrics" ON public.quality_metrics;
CREATE POLICY "Authenticated users can view quality metrics"
ON public.quality_metrics
FOR SELECT
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage quality metrics" ON public.quality_metrics;
CREATE POLICY "Service role can manage quality metrics"
ON public.quality_metrics
FOR ALL
USING ((SELECT auth.role()) = 'service_role');

-- 13) application_form_instances policies
ALTER TABLE public.application_form_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view form instances" ON public.application_form_instances;
CREATE POLICY "Everyone can view form instances"
ON public.application_form_instances
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role can manage form instances" ON public.application_form_instances;
CREATE POLICY "Service role can manage form instances"
ON public.application_form_instances
FOR ALL
USING ((SELECT auth.role()) = 'service_role');

-- 14) Clean up subsidies table duplicate policies
ALTER TABLE public.subsidies ENABLE ROW LEVEL SECURITY;

-- Remove overly broad public policy if it exists
DROP POLICY IF EXISTS "Anyone can view subsidies" ON public.subsidies;

-- Keep only authenticated access
DROP POLICY IF EXISTS "Everyone can view subsidies" ON public.subsidies;
CREATE POLICY "Authenticated users can view subsidies"
ON public.subsidies
FOR SELECT
TO authenticated
USING (true);

-- 15) farms policies (fix app_user_id references)
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farms_select ON public.farms;
CREATE POLICY farms_select
ON public.farms
FOR SELECT
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS farms_insert ON public.farms;
CREATE POLICY farms_insert
ON public.farms
FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS farms_update ON public.farms;
CREATE POLICY farms_update
ON public.farms
FOR UPDATE
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS farms_delete ON public.farms;
CREATE POLICY farms_delete
ON public.farms
FOR DELETE
USING (user_id = (SELECT auth.uid()));

-- 16) farm_documents policies
ALTER TABLE public.farm_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS farm_documents_select ON public.farm_documents;
CREATE POLICY farm_documents_select
ON public.farm_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_documents.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS farm_documents_insert ON public.farm_documents;
CREATE POLICY farm_documents_insert
ON public.farm_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_documents.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS farm_documents_update ON public.farm_documents;
CREATE POLICY farm_documents_update
ON public.farm_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_documents.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS farm_documents_delete ON public.farm_documents;
CREATE POLICY farm_documents_delete
ON public.farm_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_documents.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

-- 17) applications policies
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applications_select ON public.applications;
CREATE POLICY applications_select
ON public.applications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = applications.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS applications_insert ON public.applications;
CREATE POLICY applications_insert
ON public.applications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = applications.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS applications_update ON public.applications;
CREATE POLICY applications_update
ON public.applications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = applications.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS applications_delete ON public.applications;
CREATE POLICY applications_delete
ON public.applications
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = applications.farm_id
      AND farms.user_id = (SELECT auth.uid())
  )
);

-- 18) application_sessions policies
ALTER TABLE public.application_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own application sessions" ON public.application_sessions;
CREATE POLICY "Users can manage their own application sessions"
ON public.application_sessions
FOR ALL
USING (
  (user_id = (SELECT auth.uid())) OR 
  (
    farm_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = application_sessions.farm_id
        AND farms.user_id = (SELECT auth.uid())
    )
  )
);

-- 19) field_corrections policies
ALTER TABLE public.field_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view corrections for their documents" ON public.field_corrections;
CREATE POLICY "Users can view corrections for their documents"
ON public.field_corrections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farm_documents fd
    JOIN farms f ON fd.farm_id = f.id
    WHERE fd.id = field_corrections.document_id
      AND f.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can create corrections for their documents" ON public.field_corrections;
CREATE POLICY "Users can create corrections for their documents"
ON public.field_corrections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM farm_documents fd
    JOIN farms f ON fd.farm_id = f.id
    WHERE fd.id = field_corrections.document_id
      AND f.user_id = (SELECT auth.uid())
  )
);

-- 20) extraction_batches policies
ALTER TABLE public.extraction_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own batches" ON public.extraction_batches;
CREATE POLICY "Users can view their own batches"
ON public.extraction_batches
FOR SELECT
USING (
  (owner_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Users can create their own batches" ON public.extraction_batches;
CREATE POLICY "Users can create their own batches"
ON public.extraction_batches
FOR INSERT
WITH CHECK (
  (owner_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Service role can manage all batches" ON public.extraction_batches;
CREATE POLICY "Service role can manage all batches"
ON public.extraction_batches
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 21) model_deployments policies
ALTER TABLE public.model_deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view deployments for their training jobs" ON public.model_deployments;
CREATE POLICY "Users can view deployments for their training jobs"
ON public.model_deployments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM model_training_jobs mtj
    LEFT JOIN farms f ON mtj.farm_id = f.id
    WHERE mtj.id = model_deployments.training_job_id
      AND (mtj.farm_id IS NULL OR f.user_id = (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "Service role can manage deployments" ON public.model_deployments;
CREATE POLICY "Service role can manage deployments"
ON public.model_deployments
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 22) review_assignments policies
ALTER TABLE public.review_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view their own assignments" ON public.review_assignments;
CREATE POLICY "Authenticated users can view their own assignments"
ON public.review_assignments
FOR SELECT
USING (
  (assigned_to = (SELECT auth.uid())) OR 
  (assigned_by = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Reviewers can update their assignments" ON public.review_assignments;
CREATE POLICY "Reviewers can update their assignments"
ON public.review_assignments
FOR UPDATE
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
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 23) review_decisions policies
ALTER TABLE public.review_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviewers can view their decisions" ON public.review_decisions;
CREATE POLICY "Reviewers can view their decisions"
ON public.review_decisions
FOR SELECT
USING (
  (reviewer_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role') OR 
  EXISTS (
    SELECT 1 FROM review_assignments ra
    WHERE ra.id = review_decisions.assignment_id
      AND (
        ra.assigned_to = (SELECT auth.uid()) OR 
        ra.assigned_by = (SELECT auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "Reviewers can insert their decisions" ON public.review_decisions;
CREATE POLICY "Reviewers can insert their decisions"
ON public.review_decisions
FOR INSERT
WITH CHECK (
  (reviewer_id = (SELECT auth.uid())) OR 
  ((SELECT auth.role()) = 'service_role')
);

DROP POLICY IF EXISTS "Service role can manage all decisions" ON public.review_decisions;
CREATE POLICY "Service role can manage all decisions"
ON public.review_decisions
FOR ALL
USING ((SELECT auth.role()) = 'service_role')
WITH CHECK ((SELECT auth.role()) = 'service_role');