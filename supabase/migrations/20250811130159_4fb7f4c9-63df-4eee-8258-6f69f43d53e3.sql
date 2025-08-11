-- Create AI content runs tracking table
CREATE TABLE IF NOT EXISTS ai_content_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  pages_seen INTEGER DEFAULT 0,
  pages_eligible INTEGER DEFAULT 0, 
  pages_processed INTEGER DEFAULT 0,
  subs_created INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  model TEXT DEFAULT 'gpt-4.1-2025-04-14',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_content_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage AI content runs" 
ON ai_content_runs 
FOR ALL 
USING (auth.role() = 'service_role'::text);

CREATE POLICY "Authenticated users can view AI content runs" 
ON ai_content_runs 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);