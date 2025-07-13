-- Fix RLS policies for document_extractions to allow service role access
-- This will allow the edge function to properly insert extraction results

-- First, let's add a policy that allows service role to insert extraction results
CREATE POLICY "Service role can manage all extractions" 
ON public.document_extractions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Also ensure authenticated users can insert their own extractions
CREATE POLICY "Users can insert extractions for their documents" 
ON public.document_extractions 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM farm_documents fd 
    JOIN farms f ON fd.farm_id = f.id 
    WHERE fd.id = document_extractions.document_id 
    AND f.user_id = auth.uid()
  )
);