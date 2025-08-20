-- Just create the processing jobs table and status function (simplified)

-- Create document processing jobs table
CREATE TABLE IF NOT EXISTS public.document_processing_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  client_type TEXT NOT NULL,
  document_type TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'queued',
  priority TEXT NOT NULL DEFAULT 'medium',
  config JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  retry_attempt INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on processing jobs
ALTER TABLE public.document_processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for processing jobs
CREATE POLICY "Users can view jobs for their documents" 
ON public.document_processing_jobs 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM farm_documents fd 
    JOIN farms f ON fd.farm_id = f.id 
    WHERE fd.id = document_processing_jobs.document_id 
    AND f.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage processing jobs" 
ON public.document_processing_jobs 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON public.document_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_priority ON public.document_processing_jobs(priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_document_id ON public.document_processing_jobs(document_id);

-- Function to get processing job status
CREATE OR REPLACE FUNCTION public.get_processing_job_status(p_document_id UUID)
RETURNS TABLE(
  job_id UUID,
  status TEXT,
  priority TEXT,
  progress_percentage INTEGER,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  estimated_completion TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dpj.id,
    dpj.status,
    dpj.priority,
    CASE 
      WHEN dpj.status = 'completed' THEN 100
      WHEN dpj.status = 'processing' THEN 75
      WHEN dpj.status = 'queued' THEN 25
      WHEN dpj.status = 'failed' THEN 0
      ELSE 50
    END as progress_percentage,
    dpj.error_message,
    dpj.processing_time_ms,
    dpj.created_at,
    dpj.updated_at,
    CASE 
      WHEN dpj.status = 'completed' THEN dpj.completed_at
      WHEN dpj.status = 'processing' THEN dpj.started_at + INTERVAL '5 minutes'
      ELSE dpj.scheduled_for + INTERVAL '2 minutes'
    END as estimated_completion
  FROM document_processing_jobs dpj
  WHERE dpj.document_id = p_document_id
  ORDER BY dpj.created_at DESC
  LIMIT 1;
END;
$$;