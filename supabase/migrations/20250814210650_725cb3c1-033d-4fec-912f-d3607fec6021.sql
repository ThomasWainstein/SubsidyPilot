-- Add missing extraction_timestamp column to subsidies_structured table
ALTER TABLE public.subsidies_structured 
ADD COLUMN extraction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add index for performance
CREATE INDEX idx_subsidies_structured_extraction_timestamp ON public.subsidies_structured(extraction_timestamp);