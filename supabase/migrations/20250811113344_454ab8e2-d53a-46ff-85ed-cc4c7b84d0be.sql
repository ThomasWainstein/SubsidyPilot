-- Create pipeline_runs table for durable state management
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'canceled')) DEFAULT 'queued',
  stage TEXT NOT NULL CHECK (stage IN ('init', 'harvest', 'ai', 'forms', 'done')) DEFAULT 'init',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  error JSONB,
  stats JSONB DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view pipeline runs" ON public.pipeline_runs FOR SELECT USING (true);
CREATE POLICY "Service role can manage pipeline runs" ON public.pipeline_runs FOR ALL USING (auth.role() = 'service_role');

-- Create index for finding active runs
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_active ON public.pipeline_runs (status, created_at DESC) WHERE status IN ('queued', 'running');

-- Create index for latest run lookup
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_latest ON public.pipeline_runs (created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pipeline_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_pipeline_runs_updated_at ON public.pipeline_runs;
CREATE TRIGGER update_pipeline_runs_updated_at
  BEFORE UPDATE ON public.pipeline_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_pipeline_runs_updated_at();

-- Enable realtime for pipeline_runs
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_runs;