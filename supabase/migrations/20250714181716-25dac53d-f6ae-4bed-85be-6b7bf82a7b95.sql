-- Fix document_extractions RLS policy optimization and permissions
-- This is a follow-up to the previous performance optimization

-- 1. Drop the existing service role policy as it's too broad
DROP POLICY IF EXISTS "Service role full access to extractions" ON public.document_extractions;

-- 2. Create specific policies for service role operations
-- Service role needs INSERT and UPDATE for edge function operations
CREATE POLICY "service_role_extractions_insert" ON public.document_extractions
FOR INSERT TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_extractions_update" ON public.document_extractions
FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

-- 3. Keep optimized user access policy (already created in previous migration)
-- Users can only SELECT their own document extractions through farm ownership

-- Add comment for documentation
COMMENT ON POLICY "service_role_extractions_insert" ON public.document_extractions IS 
'Allows service role to insert extraction results from edge functions';

COMMENT ON POLICY "service_role_extractions_update" ON public.document_extractions IS 
'Allows service role to update extraction results from edge functions';