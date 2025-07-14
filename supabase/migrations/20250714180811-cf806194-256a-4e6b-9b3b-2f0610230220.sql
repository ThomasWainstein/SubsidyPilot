-- Performance Optimization: RLS Policies and Indexing
-- Fix inefficient RLS policies that re-evaluate auth functions for each row

-- 1. First, drop existing duplicate and inefficient policies
DROP POLICY IF EXISTS "Users can view own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can update own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can delete own farms" ON public.farms;
DROP POLICY IF EXISTS "Users can insert own farms" ON public.farms;

DROP POLICY IF EXISTS "Users can view own farm documents" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can update own farm documents" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can delete own farm documents" ON public.farm_documents;
DROP POLICY IF EXISTS "Users can upload to their farms" ON public.farm_documents;

DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

DROP POLICY IF EXISTS "Users can view their document extractions" ON public.document_extractions;

-- 2. Create optimized RLS policies using efficient auth function calls

-- Farms table - consolidated and optimized
CREATE POLICY "farms_user_access" ON public.farms
FOR ALL USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Farm documents table - consolidated and optimized
CREATE POLICY "farm_documents_user_access" ON public.farm_documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.farms 
    WHERE farms.id = farm_documents.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.farms 
    WHERE farms.id = farm_documents.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )
);

-- Applications table - consolidated and optimized
CREATE POLICY "applications_user_access" ON public.applications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.farms 
    WHERE farms.id = applications.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.farms 
    WHERE farms.id = applications.farm_id 
    AND farms.user_id = (SELECT auth.uid())
  )
);

-- User profiles table - consolidated and optimized
CREATE POLICY "user_profiles_self_access" ON public.user_profiles
FOR ALL USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Document extractions table - consolidated and optimized (preserve service role access)
CREATE POLICY "document_extractions_user_access" ON public.document_extractions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.farm_documents fd
    JOIN public.farms f ON fd.farm_id = f.id
    WHERE fd.id = document_extractions.document_id 
    AND f.user_id = (SELECT auth.uid())
  )
);

-- 3. Add indexes for all foreign keys to improve JOIN performance

-- Farm documents foreign key index
CREATE INDEX IF NOT EXISTS idx_farm_documents_farm_id ON public.farm_documents(farm_id);

-- Applications foreign key indexes
CREATE INDEX IF NOT EXISTS idx_applications_farm_id ON public.applications(farm_id);
CREATE INDEX IF NOT EXISTS idx_applications_subsidy_id ON public.applications(subsidy_id);

-- Document extractions foreign key index
CREATE INDEX IF NOT EXISTS idx_document_extractions_document_id ON public.document_extractions(document_id);

-- 4. Add performance indexes for common query patterns

-- Index for user-specific farm queries
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);

-- Index for document extraction status queries
CREATE INDEX IF NOT EXISTS idx_document_extractions_status ON public.document_extractions(status);

-- Index for document extraction timestamps
CREATE INDEX IF NOT EXISTS idx_document_extractions_created_at ON public.document_extractions(created_at);

-- Composite index for document extraction queries by document and status
CREATE INDEX IF NOT EXISTS idx_document_extractions_doc_status ON public.document_extractions(document_id, status);

-- 5. Add indexes for subsidy matching and filtering
CREATE INDEX IF NOT EXISTS idx_subsidies_status ON public.subsidies(status);
CREATE INDEX IF NOT EXISTS idx_subsidies_deadline ON public.subsidies(deadline);

-- GIN indexes for array fields to improve filtering
CREATE INDEX IF NOT EXISTS idx_subsidies_tags_gin ON public.subsidies USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_subsidies_region_gin ON public.subsidies USING GIN(region);
CREATE INDEX IF NOT EXISTS idx_subsidies_categories_gin ON public.subsidies USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_farms_matching_tags_gin ON public.farms USING GIN(matching_tags);

-- Comment for documentation
COMMENT ON POLICY "farms_user_access" ON public.farms IS 
'Consolidated RLS policy for farms table with optimized auth function usage';

COMMENT ON POLICY "farm_documents_user_access" ON public.farm_documents IS 
'Consolidated RLS policy for farm documents with optimized subquery';

COMMENT ON POLICY "applications_user_access" ON public.applications IS 
'Consolidated RLS policy for applications with optimized farm ownership check';

COMMENT ON POLICY "user_profiles_self_access" ON public.user_profiles IS 
'Consolidated RLS policy for user profiles with optimized auth function usage';

COMMENT ON POLICY "document_extractions_user_access" ON public.document_extractions IS 
'Optimized RLS policy for document extractions with efficient farm ownership check';