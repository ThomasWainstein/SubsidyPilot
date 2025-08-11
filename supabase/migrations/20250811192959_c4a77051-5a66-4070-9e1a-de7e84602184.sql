-- 1) Create table to persist raw AI outputs for forensic debugging
CREATE TABLE IF NOT EXISTS public.ai_raw_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  page_id UUID NOT NULL,
  model TEXT,
  raw_output TEXT NOT NULL,
  parsed_count INTEGER DEFAULT 0,
  prompt TEXT,
  content_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_ai_raw_extractions_page_created ON public.ai_raw_extractions(page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_raw_extractions_run ON public.ai_raw_extractions(run_id);

-- Enable RLS and add strict policies
ALTER TABLE public.ai_raw_extractions ENABLE ROW LEVEL SECURITY;

-- Admins can view
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_raw_extractions' AND policyname='Admins can view ai raw extractions'
  ) THEN
    CREATE POLICY "Admins can view ai raw extractions"
    ON public.ai_raw_extractions
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Service role can manage (insert/update/delete/select)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_raw_extractions' AND policyname='Service role can manage ai raw extractions'
  ) THEN
    CREATE POLICY "Service role can manage ai raw extractions"
    ON public.ai_raw_extractions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;