-- Add run_id column to raw_scraped_pages table
ALTER TABLE public.raw_scraped_pages 
ADD COLUMN run_id UUID REFERENCES public.pipeline_runs(id);