-- Add debug_info column to document_extractions table
ALTER TABLE public.document_extractions 
ADD COLUMN IF NOT EXISTS debug_info JSONB;