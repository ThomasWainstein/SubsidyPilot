-- Phase 2: Async Document Processing Infrastructure (Fixed)

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
CREATE INDEX idx_processing_jobs_status ON public.document_processing_jobs(status);
CREATE INDEX idx_processing_jobs_priority ON public.document_processing_jobs(priority, scheduled_for);
CREATE INDEX idx_processing_jobs_document_id ON public.document_processing_jobs(document_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_processing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_processing_jobs_updated_at_trigger
  BEFORE UPDATE ON public.document_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_processing_jobs_updated_at();

-- Storage event trigger function for automatic processing
CREATE OR REPLACE FUNCTION public.trigger_async_document_processing()
RETURNS TRIGGER AS $$
DECLARE
  farm_user_id UUID;
  document_record RECORD;
BEGIN
  -- Only process uploads to farm-documents bucket
  IF NEW.bucket_id = 'farm-documents' AND TG_OP = 'INSERT' THEN
    
    -- Get document details in separate queries
    SELECT fd.* INTO document_record
    FROM farm_documents fd
    WHERE fd.file_url LIKE '%' || NEW.name || '%'
    ORDER BY fd.uploaded_at DESC
    LIMIT 1;
    
    IF document_record.id IS NOT NULL THEN
      -- Get user ID
      SELECT f.user_id INTO farm_user_id
      FROM farms f
      WHERE f.id = document_record.farm_id;
      
      -- Update document status
      UPDATE farm_documents 
      SET processing_status = 'queued_for_processing' 
      WHERE id = document_record.id;
      
      -- Create processing job directly (simplified approach)
      INSERT INTO document_processing_jobs (
        document_id,
        file_url,
        file_name,
        client_type,
        document_type,
        user_id,
        status,
        priority
      ) VALUES (
        document_record.id,
        document_record.file_url,
        document_record.file_name,
        COALESCE(document_record.category::text, 'farm'),
        document_record.category::text,
        farm_user_id,
        'queued',
        'medium'
      );
      
      RAISE LOG 'Created processing job for document %', document_record.id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the storage operation
    INSERT INTO error_log (error_type, error_message, metadata)
    VALUES (
      'async_processing_trigger',
      SQLERRM,
      jsonb_build_object(
        'storage_object_name', NEW.name,
        'bucket_id', NEW.bucket_id,
        'timestamp', now()
      )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on storage.objects for automatic processing
CREATE OR REPLACE TRIGGER storage_upload_trigger
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_async_document_processing();

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