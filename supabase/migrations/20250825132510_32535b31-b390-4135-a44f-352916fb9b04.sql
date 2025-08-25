-- Ensure we have a unique constraint on (source, external_id) for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subsidies_source_external_id_unique'
  ) THEN
    ALTER TABLE public.subsidies 
    ADD CONSTRAINT subsidies_source_external_id_unique 
    UNIQUE (source, external_id);
  END IF;
END
$$;