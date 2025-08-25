-- Clean up - remove duplicate tables and complex system
DROP TABLE IF EXISTS subsidies_structured CASCADE;

-- Keep ONLY the main subsidies table with ONE additional column
ALTER TABLE subsidies 
ADD COLUMN IF NOT EXISTS parsed_data JSONB DEFAULT '{}';

-- Simple index for performance
CREATE INDEX IF NOT EXISTS idx_subsidies_parsed_data 
ON subsidies USING gin(parsed_data);

-- Clean up unnecessary columns from previous complex system
ALTER TABLE subsidies 
DROP COLUMN IF EXISTS enhanced_funding_info,
DROP COLUMN IF EXISTS enhanced_eligibility_info,
DROP COLUMN IF EXISTS extraction_completeness_score,
DROP COLUMN IF EXISTS ai_enhancement_status,
DROP COLUMN IF EXISTS last_enhanced_at;