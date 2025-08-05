-- Add application schema and documents columns to subsidies table
ALTER TABLE public.subsidies 
ADD COLUMN IF NOT EXISTS application_schema jsonb,
ADD COLUMN IF NOT EXISTS application_docs jsonb DEFAULT '[]'::jsonb;

-- Create document extraction status table
CREATE TABLE IF NOT EXISTS public.document_extraction_status (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subsidy_id uuid NOT NULL,
    document_url text NOT NULL,
    document_type text NOT NULL,
    extraction_status text NOT NULL DEFAULT 'pending',
    field_count integer DEFAULT 0,
    coverage_percentage numeric DEFAULT 0,
    extraction_errors jsonb DEFAULT '[]'::jsonb,
    extracted_schema jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on document_extraction_status
ALTER TABLE public.document_extraction_status ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_extraction_status
CREATE POLICY "Service role can manage extraction status" 
ON public.document_extraction_status 
FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Users can view extraction status" 
ON public.document_extraction_status 
FOR SELECT 
USING (auth.role() = 'authenticated');