-- Create model_training_jobs table for tracking training jobs
CREATE TABLE public.model_training_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL DEFAULT 'layoutlm-v3',
  status TEXT NOT NULL DEFAULT 'queued',
  config JSONB NOT NULL DEFAULT '{}',
  dataset_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metrics JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create model_deployments table for tracking model deployments
CREATE TABLE public.model_deployments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_job_id UUID REFERENCES public.model_training_jobs(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'deploying',
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metrics JSONB,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_deployments ENABLE ROW LEVEL SECURITY;

-- Create policies for model_training_jobs
CREATE POLICY "Users can view training jobs for their farms" 
ON public.model_training_jobs 
FOR SELECT 
USING (
  farm_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM farms 
    WHERE farms.id = model_training_jobs.farm_id 
    AND farms.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage training jobs" 
ON public.model_training_jobs 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create policies for model_deployments
CREATE POLICY "Users can view deployments for their training jobs" 
ON public.model_deployments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM model_training_jobs mtj
    LEFT JOIN farms f ON mtj.farm_id = f.id
    WHERE mtj.id = model_deployments.training_job_id 
    AND (mtj.farm_id IS NULL OR f.user_id = auth.uid())
  )
);

CREATE POLICY "Service role can manage deployments" 
ON public.model_deployments 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create triggers for updated_at
CREATE TRIGGER update_model_training_jobs_updated_at
BEFORE UPDATE ON public.model_training_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_model_deployments_updated_at
BEFORE UPDATE ON public.model_deployments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();