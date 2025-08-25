-- Fix les-aides.fr sync system - Schema & Data Cleanup

-- 1) Add missing columns to subsidies table for proper sync tracking
ALTER TABLE public.subsidies 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS version_hash TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2) Create sync infrastructure tables
CREATE TABLE IF NOT EXISTS public.ingestion_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  base_url TEXT,
  is_enabled BOOLEAN DEFAULT true,
  last_success_at TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  source_code TEXT NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'error', 'cancelled')),
  total INTEGER DEFAULT 0,
  inserted INTEGER DEFAULT 0,
  updated INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  config JSONB DEFAULT '{}',
  run_type TEXT DEFAULT 'manual' CHECK (run_type IN ('manual', 'scheduled', 'triggered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sync_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.sync_runs(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  item_type TEXT DEFAULT 'subsidy',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  error_type TEXT, -- HTTP_ERROR, PARSE_ERROR, VALIDATION_ERROR, RLS_ERROR, UNKNOWN
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  item_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3) Create agencies reference table
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT,
  country_code TEXT DEFAULT 'FR',
  agency_type TEXT DEFAULT 'government',
  website TEXT,
  contact_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4) Add foreign key to subsidies for agency reference  
ALTER TABLE public.subsidies 
ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id);

-- 5) Insert les-aides.fr source
INSERT INTO public.ingestion_sources (code, name, base_url, config)
VALUES (
  'les-aides-fr',
  'Les Aides France',
  'https://les-aides.fr',
  '{"rate_limit_ms": 1000, "max_pages": 50, "timeout_seconds": 30}'::jsonb
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  config = EXCLUDED.config,
  updated_at = now();

-- 6) Clean up existing broken data and set proper source
UPDATE public.subsidies 
SET source = 'les-aides-fr',
    api_source = 'les-aides-fr' 
WHERE api_source IS NULL OR api_source = '';

-- 7) Create unique constraint for external_id + source
CREATE UNIQUE INDEX IF NOT EXISTS idx_subsidies_source_external_id 
ON public.subsidies(source, external_id) 
WHERE external_id IS NOT NULL;

-- 8) Enable RLS on new tables
ALTER TABLE public.ingestion_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.sync_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- 9) RLS Policies for new tables
CREATE POLICY "Service role can manage ingestion sources" ON public.ingestion_sources
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view ingestion sources" ON public.ingestion_sources  
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage sync runs" ON public.sync_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view sync runs" ON public.sync_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage sync items" ON public.sync_items
  FOR ALL USING (auth.role() = 'service_role'); 

CREATE POLICY "Admins can view sync items" ON public.sync_items
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage agencies" ON public.agencies
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view agencies" ON public.agencies
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

-- 10) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_runs_source_status ON public.sync_runs(source_code, status);
CREATE INDEX IF NOT EXISTS idx_sync_items_run_status ON public.sync_items(run_id, status);
CREATE INDEX IF NOT EXISTS idx_subsidies_source ON public.subsidies(source);
CREATE INDEX IF NOT EXISTS idx_subsidies_last_synced ON public.subsidies(last_synced_at);

-- 11) Create function to clean stuck syncs  
CREATE OR REPLACE FUNCTION public.cleanup_stuck_syncs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stuck_count INTEGER;
BEGIN
  -- Mark runs older than 2 hours as failed
  WITH stuck_runs AS (
    UPDATE public.sync_runs 
    SET status = 'error',
        finished_at = now(),
        error_message = 'Sync stuck - auto-cancelled after 2 hours'
    WHERE status = 'running' 
    AND started_at < now() - interval '2 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO stuck_count FROM stuck_runs;
  
  -- Mark related items as failed too
  UPDATE public.sync_items 
  SET status = 'failed',
      error_type = 'TIMEOUT_ERROR',
      error_message = 'Parent sync run was stuck and cancelled'
  WHERE run_id IN (
    SELECT id FROM public.sync_runs 
    WHERE status = 'error' 
    AND error_message LIKE '%stuck%'
  ) AND status IN ('pending', 'processing');
  
  RETURN stuck_count;
END;
$$;