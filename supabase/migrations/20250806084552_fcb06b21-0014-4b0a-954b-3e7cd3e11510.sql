-- =========================================
-- HIGH PRIORITY FIX #1: DOCUMENT-SUBSIDY MAPPING
-- Create explicit relationship table for better queries
-- =========================================

-- Create document-subsidy mapping table (if not exists)
CREATE TABLE IF NOT EXISTS public.document_subsidy_mappings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    subsidy_id UUID NOT NULL,
    mapping_type TEXT NOT NULL CHECK (mapping_type IN ('extracted_from', 'referenced_in', 'related_to')),
    confidence_score NUMERIC DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extraction_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Prevent duplicate mappings
    UNIQUE(document_id, subsidy_id, mapping_type)
);

-- Enable RLS
ALTER TABLE public.document_subsidy_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view document mappings" 
ON public.document_subsidy_mappings 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage document mappings" 
ON public.document_subsidy_mappings 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_subsidy_mapping_document ON public.document_subsidy_mappings(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_subsidy_mapping_subsidy ON public.document_subsidy_mappings(subsidy_id);
CREATE INDEX IF NOT EXISTS idx_doc_subsidy_mapping_type ON public.document_subsidy_mappings(mapping_type);

-- =========================================
-- HIGH PRIORITY FIX #2: CONTENT VERSIONING
-- Add change detection for re-scraped content
-- =========================================

-- Create content versions table
CREATE TABLE IF NOT EXISTS public.content_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    source_url TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('subsidy', 'document', 'form', 'extraction')),
    resource_id UUID NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    content_hash TEXT NOT NULL, -- SHA256 hash
    previous_version_id UUID REFERENCES public.content_versions(id) ON DELETE SET NULL,
    change_summary JSONB NOT NULL DEFAULT '{}',
    change_confidence NUMERIC DEFAULT 1.0 CHECK (change_confidence >= 0 AND change_confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Ensure version sequence
    UNIQUE(resource_type, resource_id, version_number)
);

-- Enable RLS
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view content versions" 
ON public.content_versions 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage content versions" 
ON public.content_versions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create content change log table
CREATE TABLE IF NOT EXISTS public.content_change_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL,
    version_id UUID NOT NULL REFERENCES public.content_versions(id) ON DELETE CASCADE,
    changed_fields JSONB NOT NULL DEFAULT '{}',
    change_type TEXT NOT NULL CHECK (change_type IN ('auto', 'manual', 'system')),
    detected_by TEXT,
    detection_confidence NUMERIC DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_change_log ENABLE ROW LEVEL SECURITY;

-- RLS policies  
CREATE POLICY "Authenticated users can view change log" 
ON public.content_change_log 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage change log" 
ON public.content_change_log 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_versions_resource ON public.content_versions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_hash ON public.content_versions(content_hash);
CREATE INDEX IF NOT EXISTS idx_content_change_log_resource ON public.content_change_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_content_change_log_version ON public.content_change_log(version_id);