-- Create tables for better pipeline observability and error tracking

-- Table for tracking harvest issues
CREATE TABLE IF NOT EXISTS public.harvest_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.pipeline_runs(id),
  page_id UUID,
  source_url TEXT,
  reason TEXT NOT NULL,
  content_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for tracking AI content processing errors
CREATE TABLE IF NOT EXISTS public.ai_content_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.pipeline_runs(id),
  page_id UUID,
  source_url TEXT,
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add version column to pipeline_runs for optimistic locking
ALTER TABLE public.pipeline_runs 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_harvest_issues_run_id ON public.harvest_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_errors_run_id ON public.ai_content_errors(run_id);
CREATE INDEX IF NOT EXISTS idx_raw_scraped_pages_run_id ON public.raw_scraped_pages(run_id);

-- Create SQL view for AI run summary
CREATE OR REPLACE VIEW public.v_ai_run_summary AS
SELECT 
  run_id,
  COUNT(*) as pages,
  COUNT(*) FILTER (WHERE ok) as pages_ok,
  COUNT(*) FILTER (WHERE NOT ok) as pages_failed,
  AVG(content_length) as avg_content_length
FROM (
  SELECT 
    p.id as page_id, 
    p.run_id,
    COALESCE(LENGTH(p.text_markdown), 0) + 
    COALESCE(LENGTH(p.raw_text), 0) + 
    COALESCE(LENGTH(p.raw_html), 0) as content_length,
    (COALESCE(LENGTH(p.text_markdown), 0) + 
     COALESCE(LENGTH(p.raw_text), 0) + 
     COALESCE(LENGTH(p.raw_html), 0)) >= 200 as ok
  FROM raw_scraped_pages p
  WHERE p.run_id IS NOT NULL
) x 
GROUP BY run_id;

-- RLS Policies for new tables
ALTER TABLE public.harvest_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_content_errors ENABLE ROW LEVEL SECURITY;

-- Service role can manage all data
CREATE POLICY "Service role can manage harvest issues" ON public.harvest_issues
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage AI content errors" ON public.ai_content_errors
  FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can view error data
CREATE POLICY "Authenticated users can view harvest issues" ON public.harvest_issues
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view AI content errors" ON public.ai_content_errors
  FOR SELECT USING (auth.role() = 'authenticated');