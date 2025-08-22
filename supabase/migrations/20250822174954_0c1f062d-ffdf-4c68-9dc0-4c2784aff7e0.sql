-- Enable real-time functionality for document_extractions table
ALTER TABLE public.document_extractions REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_extractions;