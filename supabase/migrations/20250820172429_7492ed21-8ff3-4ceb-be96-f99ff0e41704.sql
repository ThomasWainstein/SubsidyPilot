-- Create production monitoring and health tracking tables

-- API usage tracking table
CREATE TABLE IF NOT EXISTS public.api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL CHECK (service IN ('google_vision', 'openai')),
  date DATE NOT NULL,
  requests_used INTEGER DEFAULT 0,
  cost_used DECIMAL(10,4) DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  total_processing_time_ms BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(service, date)
);

-- Service health status tracking
CREATE TABLE IF NOT EXISTS public.service_health_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  google_vision_status TEXT NOT NULL DEFAULT 'healthy' CHECK (google_vision_status IN ('healthy', 'degraded', 'down')),
  openai_status TEXT NOT NULL DEFAULT 'healthy' CHECK (openai_status IN ('healthy', 'degraded', 'down')),
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced extraction metrics table
ALTER TABLE public.extraction_metrics 
ADD COLUMN IF NOT EXISTS client_type TEXT,
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS error_type TEXT;

-- Manual review queue for failed extractions
CREATE TABLE IF NOT EXISTS public.manual_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  client_type TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  reason TEXT,
  error_details JSONB DEFAULT '[]',
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
  assigned_to UUID,
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  resolution_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_health_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_usage_tracking
CREATE POLICY "Admins can view API usage" ON public.api_usage_tracking
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage API usage" ON public.api_usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for service_health_status  
CREATE POLICY "Admins can view service health" ON public.service_health_status
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage service health" ON public.service_health_status
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for manual_review_queue
CREATE POLICY "Admins can view manual review queue" ON public.manual_review_queue
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage manual review queue" ON public.manual_review_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_service_date ON public.api_usage_tracking(service, date);
CREATE INDEX IF NOT EXISTS idx_manual_review_status ON public.manual_review_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_extraction_metrics_client_timestamp ON public.extraction_metrics(client_type, timestamp);

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_api_usage_tracking_updated_at
    BEFORE UPDATE ON public.api_usage_tracking
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_timestamp();

CREATE TRIGGER update_service_health_status_updated_at
    BEFORE UPDATE ON public.service_health_status
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_timestamp();

CREATE TRIGGER update_manual_review_queue_updated_at
    BEFORE UPDATE ON public.manual_review_queue
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_timestamp();