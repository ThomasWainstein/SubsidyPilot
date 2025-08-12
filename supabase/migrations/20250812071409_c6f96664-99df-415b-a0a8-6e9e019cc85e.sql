-- 1) Add columns to raw_scraped_pages for sections and attachments
ALTER TABLE public.raw_scraped_pages
ADD COLUMN IF NOT EXISTS sections_jsonb JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS attachments_jsonb JSONB DEFAULT '[]'::jsonb;

-- 2) Create harvested_documents table to persist linked docs metadata (and optional OCR later)
CREATE TABLE IF NOT EXISTS public.harvested_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID,
  page_id UUID,
  source_url TEXT NOT NULL,
  filename TEXT,
  mime TEXT,
  size_bytes BIGINT,
  sha256 TEXT,
  text_ocr TEXT,
  pages INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for harvested_documents
ALTER TABLE public.harvested_documents ENABLE ROW LEVEL SECURITY;

-- Allow service role full access, admins read
CREATE POLICY service_role_can_manage_harvested_documents ON public.harvested_documents
  FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY admins_can_view_harvested_documents ON public.harvested_documents
  FOR SELECT TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Extend subsidies_structured with verbatim and structured arrays
ALTER TABLE public.subsidies_structured
ADD COLUMN IF NOT EXISTS verbatim_jsonb JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS deadlines_jsonb JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS documents_jsonb JSONB DEFAULT '[]'::jsonb;

-- Optional helpful indexes
CREATE INDEX IF NOT EXISTS idx_raw_pages_sections ON public.raw_scraped_pages USING GIN (sections_jsonb);
CREATE INDEX IF NOT EXISTS idx_raw_pages_attachments ON public.raw_scraped_pages USING GIN (attachments_jsonb);
CREATE INDEX IF NOT EXISTS idx_subsidies_deadlines ON public.subsidies_structured USING GIN (deadlines_jsonb);
CREATE INDEX IF NOT EXISTS idx_subsidies_verbatim ON public.subsidies_structured USING GIN (verbatim_jsonb);
