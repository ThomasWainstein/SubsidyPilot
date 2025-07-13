-- Fix the RLS policy issue by ensuring service role has proper access
-- Remove conflicting policies and create a clear service role policy

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Service role can manage all extractions" ON public.document_extractions;
DROP POLICY IF EXISTS "Users can insert extractions for their documents" ON public.document_extractions;

-- Create a comprehensive service role policy that works with edge functions
CREATE POLICY "Service role full access to extractions"
ON public.document_extractions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a policy for authenticated users to view their own extractions
CREATE POLICY "Users can view their document extractions"
ON public.document_extractions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM farm_documents fd
    JOIN farms f ON fd.farm_id = f.id
    WHERE fd.id = document_extractions.document_id
    AND f.user_id = auth.uid()
  )
);