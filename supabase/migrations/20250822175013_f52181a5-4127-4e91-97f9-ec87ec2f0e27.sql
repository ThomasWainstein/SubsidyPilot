-- Enable full replica identity for document_extractions table to capture complete row data
ALTER TABLE public.document_extractions REPLICA IDENTITY FULL;