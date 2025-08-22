-- Fix RLS policy for document_processing_jobs table
-- The logs show "new row violates row-level security policy for table document_processing_jobs"

-- Check existing policies and update them to handle universal clients properly

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can create jobs for their documents" ON document_processing_jobs;
DROP POLICY IF EXISTS "Users can create processing jobs" ON document_processing_jobs;

-- Create more flexible policies for document processing jobs
CREATE POLICY "Users can create their own processing jobs" 
ON document_processing_jobs FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR 
  user_id IS NULL OR 
  auth.role() = 'service_role'
);

CREATE POLICY "Users can view jobs for their documents or service role" 
ON document_processing_jobs FOR SELECT 
USING (
  user_id = auth.uid() OR 
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1 FROM farm_documents fd 
    JOIN farms f ON fd.farm_id = f.id 
    WHERE fd.id = document_processing_jobs.document_id 
    AND f.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM client_documents cd 
    WHERE cd.id = document_processing_jobs.document_id 
    AND cd.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all processing jobs" 
ON document_processing_jobs FOR ALL 
USING (auth.role() = 'service_role');