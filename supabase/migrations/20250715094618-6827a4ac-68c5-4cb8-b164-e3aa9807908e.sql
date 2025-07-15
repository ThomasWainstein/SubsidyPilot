-- Create scraper_logs table for monitoring scraper runs
CREATE TABLE public.scraper_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    run_start TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_scraper_logs_session_id ON public.scraper_logs(session_id);
CREATE INDEX idx_scraper_logs_timestamp ON public.scraper_logs(timestamp DESC);
CREATE INDEX idx_scraper_logs_status ON public.scraper_logs(status);

-- Enable RLS
ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for scraper logs (service role can insert, admin users can read)
CREATE POLICY "Service role can insert scraper logs" 
ON public.scraper_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view scraper logs" 
ON public.scraper_logs 
FOR SELECT 
USING (auth.role() IN ('authenticated', 'service_role'));

-- Add comment for documentation
COMMENT ON TABLE public.scraper_logs IS 'Logs for AgriTool scraper pipeline runs and monitoring';
COMMENT ON COLUMN public.scraper_logs.session_id IS 'Unique identifier for each scraper run session';
COMMENT ON COLUMN public.scraper_logs.status IS 'Status: info, success, warning, error, failed';
COMMENT ON COLUMN public.scraper_logs.details IS 'Additional structured data about the log entry';