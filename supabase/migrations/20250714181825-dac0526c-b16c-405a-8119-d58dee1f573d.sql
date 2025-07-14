-- Fix document_extractions RLS policy for service role operations
-- Correct syntax for service role policies

-- 1. Drop the existing overly broad service role policy
DROP POLICY IF EXISTS "Service role full access to extractions" ON public.document_extractions;

-- 2. Create specific policies for service role with correct syntax
-- Service role needs INSERT access for edge function operations
CREATE POLICY "service_role_extractions_insert" ON public.document_extractions
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Service role needs UPDATE access for edge function operations  
CREATE POLICY "service_role_extractions_update" ON public.document_extractions
FOR UPDATE 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3. Keep the optimized user access policy (already exists from previous migration)
-- Users can only SELECT their own document extractions through farm ownership

-- Add comments for documentation
COMMENT ON POLICY "service_role_extractions_insert" ON public.document_extractions IS 
'Allows service role to insert extraction results from edge functions';

COMMENT ON POLICY "service_role_extractions_update" ON public.document_extractions IS 
'Allows service role to update extraction results from edge functions';