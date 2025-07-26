-- Create raw_logs table for unprocessed subsidy data
CREATE TABLE IF NOT EXISTS public.raw_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payload TEXT NOT NULL,
    file_refs TEXT[] DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subsidies_structured table for processed canonical data
CREATE TABLE IF NOT EXISTS public.subsidies_structured (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_log_id UUID NOT NULL REFERENCES public.raw_logs(id),
    url TEXT,
    title TEXT,
    description TEXT,
    eligibility TEXT,
    documents JSONB DEFAULT '[]',
    deadline DATE,
    amount NUMERIC,
    program TEXT,
    agency TEXT,
    region TEXT,
    sector TEXT,
    funding_type TEXT,
    co_financing_rate NUMERIC,
    project_duration TEXT,
    payment_terms TEXT,
    application_method TEXT,
    evaluation_criteria TEXT,
    previous_acceptance_rate NUMERIC,
    priority_groups JSONB DEFAULT '[]',
    legal_entity_type TEXT,
    funding_source TEXT,
    reporting_requirements TEXT,
    compliance_requirements TEXT,
    language TEXT,
    technical_support TEXT,
    matching_algorithm_score NUMERIC,
    audit JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create error_log table for tracking processing failures
CREATE TABLE IF NOT EXISTS public.error_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_log_id UUID REFERENCES public.raw_logs(id),
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.raw_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsidies_structured ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can manage raw_logs" 
ON public.raw_logs 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage subsidies_structured" 
ON public.subsidies_structured 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage error_log" 
ON public.error_log 
FOR ALL 
USING (auth.role() = 'service_role') 
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_raw_logs_processed ON public.raw_logs(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_raw_logs_created_at ON public.raw_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_subsidies_structured_raw_log_id ON public.subsidies_structured(raw_log_id);
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON public.error_log(created_at);

-- Create trigger for updating timestamps
CREATE TRIGGER update_raw_logs_updated_at
    BEFORE UPDATE ON public.raw_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subsidies_structured_updated_at
    BEFORE UPDATE ON public.subsidies_structured
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function for advisory locks
CREATE OR REPLACE FUNCTION public.acquire_processing_lock(log_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Try to acquire advisory lock using the log_id hash
    RETURN pg_try_advisory_lock(hashtext(log_id::text));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.release_processing_lock(log_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Release advisory lock using the log_id hash
    RETURN pg_advisory_unlock(hashtext(log_id::text));
END;
$$ LANGUAGE plpgsql;