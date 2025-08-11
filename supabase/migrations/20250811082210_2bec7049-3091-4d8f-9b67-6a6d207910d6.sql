-- Phase C: Virus Scanning Implementation
-- Add scan_results column to farm_documents
ALTER TABLE farm_documents 
ADD COLUMN IF NOT EXISTS scan_results jsonb DEFAULT jsonb_build_object(
  'scan_vendor', null,
  'scan_time', null,
  'threats_detected', '[]'::jsonb,
  'clean', null,
  'scan_id', null
);

-- Create index for scan results queries
CREATE INDEX IF NOT EXISTS idx_farm_documents_scan_status 
ON farm_documents((scan_results->>'clean')) 
WHERE scan_results IS NOT NULL;

-- Update extraction_metrics to support virus scanning operations
-- (Already exists, just documenting the operation_type = 'virus_scan')

-- Add RLS policy updates for scan results access
-- Users can only see scan results for their own documents
-- Service role can manage all scan results

-- Update existing farm_documents policies to include scan_results in select
-- (The existing policies already cover this since they use SELECT *)