-- =========================================
-- HIGH PRIORITY FIX #2 (CONTINUED): CONTENT VERSIONING
-- Add change detection for re-scraped content (skip existing tables)
-- =========================================

-- Create content change log table (only if document_subsidy_mappings exists)
DO $$ 
BEGIN
    -- Only create if document_subsidy_mappings already exists (indicating previous migration partially succeeded)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_subsidy_mappings') THEN
        
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

        -- Enable RLS only if not already enabled
        DO $inner$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_versions') THEN
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
            END IF;
        END $inner$;

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

        -- Enable RLS only if not already enabled
        DO $inner$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_change_log') THEN
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
            END IF;
        END $inner$;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_content_versions_resource ON public.content_versions(resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_content_versions_hash ON public.content_versions(content_hash);
        CREATE INDEX IF NOT EXISTS idx_content_change_log_resource ON public.content_change_log(resource_id);
        CREATE INDEX IF NOT EXISTS idx_content_change_log_version ON public.content_change_log(version_id);

    END IF;
END $$;

-- =========================================
-- HIGH PRIORITY FIX #3: UNUSED DATABASE FIELDS
-- Add functions to populate unused markdown fields
-- =========================================

-- Function to compute content hash
CREATE OR REPLACE FUNCTION public.compute_content_hash(content_data JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN encode(sha256(content_data::text::bytea), 'hex');
END;
$$;

-- Function to detect content changes and create versions
CREATE OR REPLACE FUNCTION public.detect_content_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    old_hash TEXT;
    new_hash TEXT;
    version_num INTEGER;
    change_fields JSONB := '{}';
BEGIN
    -- Compute hashes for old and new content
    IF TG_OP = 'UPDATE' THEN
        old_hash := compute_content_hash(to_jsonb(OLD));
    END IF;
    new_hash := compute_content_hash(to_jsonb(NEW));
    
    -- Only proceed if content actually changed or this is an insert
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND old_hash != new_hash) THEN
        
        -- Get next version number
        SELECT COALESCE(MAX(version_number), 0) + 1 
        INTO version_num
        FROM content_versions 
        WHERE resource_type = TG_TABLE_NAME AND resource_id = NEW.id;
        
        -- Detect specific changed fields for updates
        IF TG_OP = 'UPDATE' THEN
            -- Compare key fields and build change summary
            IF OLD.title IS DISTINCT FROM NEW.title THEN
                change_fields := change_fields || jsonb_build_object('title', 'changed');
            END IF;
            IF OLD.description IS DISTINCT FROM NEW.description THEN
                change_fields := change_fields || jsonb_build_object('description', 'changed');
            END IF;
            -- Add more field comparisons as needed
        END IF;
        
        -- Insert version record
        INSERT INTO content_versions (
            source_url,
            resource_type, 
            resource_id,
            version_number,
            content_hash,
            change_summary
        ) VALUES (
            CASE 
                WHEN TG_TABLE_NAME = 'subsidies_structured' THEN NEW.url
                ELSE NULL 
            END,
            TG_TABLE_NAME,
            NEW.id,
            version_num,
            new_hash,
            change_fields
        );
        
    END IF;
    
    RETURN NEW;
END;
$$;