-- Add missing columns to subsidies table for FranceAgriMer scraper
ALTER TABLE public.subsidies 
ADD COLUMN IF NOT EXISTS raw_content jsonb,
ADD COLUMN IF NOT EXISTS agency text,
ADD COLUMN IF NOT EXISTS documents jsonb,
ADD COLUMN IF NOT EXISTS source_url text,
ADD COLUMN IF NOT EXISTS domain text;