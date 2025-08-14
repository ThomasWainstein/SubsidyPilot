-- Add missing confidence_score column to subsidies_structured table
ALTER TABLE public.subsidies_structured 
ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.0;

-- Add index for performance
CREATE INDEX idx_subsidies_structured_confidence_score ON public.subsidies_structured(confidence_score);