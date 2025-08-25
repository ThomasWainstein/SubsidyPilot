-- Add enhanced funding info column to subsidies table for storing parsed funding data
ALTER TABLE subsidies ADD COLUMN IF NOT EXISTS enhanced_funding_info JSONB DEFAULT NULL;

-- Add extraction completeness score to track parsing quality
ALTER TABLE subsidies ADD COLUMN IF NOT EXISTS extraction_completeness_score INTEGER DEFAULT 0;