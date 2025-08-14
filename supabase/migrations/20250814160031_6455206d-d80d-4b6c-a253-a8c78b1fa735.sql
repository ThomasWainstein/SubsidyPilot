-- Add missing ai_model column to subsidies_structured table
ALTER TABLE subsidies_structured 
ADD COLUMN IF NOT EXISTS ai_model TEXT;