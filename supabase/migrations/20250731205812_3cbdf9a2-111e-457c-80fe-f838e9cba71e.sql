-- Add application schema and documents columns to subsidies table (if not exists)
ALTER TABLE public.subsidies 
ADD COLUMN IF NOT EXISTS application_schema jsonb,
ADD COLUMN IF NOT EXISTS application_docs jsonb DEFAULT '[]'::jsonb;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage extraction status" ON public.document_extraction_status;
DROP POLICY IF EXISTS "Users can view extraction status" ON public.document_extraction_status;

-- Create RLS policies for document_extraction_status
CREATE POLICY "Service role can manage extraction status" 
ON public.document_extraction_status 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Users can view extraction status" 
ON public.document_extraction_status 
FOR SELECT 
USING (auth.role() = 'authenticated');