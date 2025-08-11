-- Fix pipeline_runs table schema to support error handling
ALTER TABLE public.pipeline_runs 
ADD COLUMN IF NOT EXISTS error_details JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT NULL;