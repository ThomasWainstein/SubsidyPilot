-- Create table for storing subsidy form schemas
CREATE TABLE IF NOT EXISTS public.subsidy_form_schemas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subsidy_id UUID NOT NULL,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add foreign key reference to subsidies_structured
  CONSTRAINT fk_subsidy_form_schemas_subsidy 
    FOREIGN KEY (subsidy_id) 
    REFERENCES subsidies_structured(id) 
    ON DELETE CASCADE
);

-- Create table for storing subsidy applications
CREATE TABLE IF NOT EXISTS public.subsidy_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL,
  farm_id UUID,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Add foreign key references
  CONSTRAINT fk_subsidy_applications_form 
    FOREIGN KEY (form_id) 
    REFERENCES subsidy_form_schemas(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_subsidy_applications_farm 
    FOREIGN KEY (farm_id) 
    REFERENCES farms(id) 
    ON DELETE SET NULL
);

-- Enable RLS on both tables
ALTER TABLE public.subsidy_form_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsidy_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for subsidy_form_schemas
CREATE POLICY "Public can view form schemas"
  ON public.subsidy_form_schemas
  FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage form schemas"
  ON public.subsidy_form_schemas
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- RLS policies for subsidy_applications
CREATE POLICY "Users can create their own applications"
  ON public.subsidy_applications
  FOR INSERT
  WITH CHECK (
    farm_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM farms 
      WHERE farms.id = subsidy_applications.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own applications"
  ON public.subsidy_applications
  FOR SELECT
  USING (
    farm_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM farms 
      WHERE farms.id = subsidy_applications.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own applications"
  ON public.subsidy_applications
  FOR UPDATE
  USING (
    farm_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM farms 
      WHERE farms.id = subsidy_applications.farm_id 
      AND farms.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all applications"
  ON public.subsidy_applications
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subsidy_form_schemas_subsidy_id 
  ON public.subsidy_form_schemas(subsidy_id);

CREATE INDEX IF NOT EXISTS idx_subsidy_applications_form_id 
  ON public.subsidy_applications(form_id);

CREATE INDEX IF NOT EXISTS idx_subsidy_applications_farm_id 
  ON public.subsidy_applications(farm_id);

CREATE INDEX IF NOT EXISTS idx_subsidy_applications_status 
  ON public.subsidy_applications(status);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subsidy_form_schemas_updated_at
  BEFORE UPDATE ON public.subsidy_form_schemas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subsidy_applications_updated_at
  BEFORE UPDATE ON public.subsidy_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();