-- Add RLS policies for phase_d_extractions table
-- This table should be readable by authenticated users and manageable by service role

ALTER TABLE phase_d_extractions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view phase_d_extractions
CREATE POLICY "Authenticated users can view phase_d_extractions" 
ON phase_d_extractions 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow service role to manage phase_d_extractions  
CREATE POLICY "Service role can manage phase_d_extractions" 
ON phase_d_extractions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add RLS policies for phase_d_stats_daily (read-only analytics view)
ALTER TABLE phase_d_stats_daily ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view daily stats
CREATE POLICY "Authenticated users can view phase_d_stats_daily" 
ON phase_d_stats_daily 
FOR SELECT 
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Service role can manage daily stats  
CREATE POLICY "Service role can manage phase_d_stats_daily" 
ON phase_d_stats_daily 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');