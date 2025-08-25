-- Add enhanced funding info columns to subsidies_structured table
ALTER TABLE public.subsidies_structured 
ADD COLUMN IF NOT EXISTS enhanced_funding_info jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS enhanced_eligibility_info jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS extraction_completeness_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_enhancement_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_enhanced_at timestamp with time zone;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_enhanced_funding 
ON public.subsidies_structured USING gin(enhanced_funding_info);

-- Update existing records to have proper default values
UPDATE public.subsidies_structured 
SET enhanced_funding_info = '{}',
    enhanced_eligibility_info = '{}',
    extraction_completeness_score = 0,
    ai_enhancement_status = 'pending'
WHERE enhanced_funding_info IS NULL;