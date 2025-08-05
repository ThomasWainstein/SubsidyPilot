-- Create farm_document_extraction_status table and trigger
CREATE TABLE IF NOT EXISTS public.farm_document_extraction_status (
    document_id uuid PRIMARY KEY,
    status text NOT NULL DEFAULT 'pending',
    field_count integer DEFAULT 0,
    last_updated timestamptz NOT NULL DEFAULT now(),
    error text
);

-- Add foreign key constraint to farm_documents
ALTER TABLE public.farm_document_extraction_status
ADD CONSTRAINT fk_farm_document_extraction_status_document_id
FOREIGN KEY (document_id) REFERENCES public.farm_documents(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.farm_document_extraction_status ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "service_role_manage_farm_doc_status"
ON public.farm_document_extraction_status
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_farm_doc_status"
ON public.farm_document_extraction_status
FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger function to notify edge function after insert into document_extractions
CREATE OR REPLACE FUNCTION public.trigger_farm_document_status_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    'https://gvfgvbztagafjykncwto.supabase.co/functions/v1/update-farm-document-status',
    jsonb_build_object('record', row_to_json(NEW)),
    'application/json',
    jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO error_log (error_type, error_message, metadata)
  VALUES (
    'farm_document_status_trigger',
    SQLERRM,
    jsonb_build_object(
      'document_id', NEW.document_id,
      'timestamp', now()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS farm_document_status_trigger ON public.document_extractions;
CREATE TRIGGER farm_document_status_trigger
AFTER INSERT ON public.document_extractions
FOR EACH ROW EXECUTE FUNCTION public.trigger_farm_document_status_update();

COMMENT ON TABLE public.farm_document_extraction_status IS 'Tracks extraction progress for farm documents';
COMMENT ON FUNCTION public.trigger_farm_document_status_update() IS 'Calls edge function to maintain farm document extraction status';
COMMENT ON TRIGGER farm_document_status_trigger ON public.document_extractions IS 'Trigger edge function after document extraction inserts';
