-- Add missing application_url column to subsidies table
ALTER TABLE subsidies ADD COLUMN IF NOT EXISTS application_url TEXT;