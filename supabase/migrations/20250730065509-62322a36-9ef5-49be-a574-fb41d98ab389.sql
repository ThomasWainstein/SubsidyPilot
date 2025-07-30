-- Create table for field corrections audit trail
CREATE TABLE IF NOT EXISTS public.field_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  original_value JSONB,
  corrected_value JSONB NOT NULL,
  correction_notes TEXT,
  corrected_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.field_corrections ENABLE ROW LEVEL SECURITY;

-- Create policies for field corrections
CREATE POLICY "Users can view corrections for their documents" 
ON public.field_corrections 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM farm_documents fd
  JOIN farms f ON fd.farm_id = f.id
  WHERE fd.id = field_corrections.document_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Users can create corrections for their documents" 
ON public.field_corrections 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM farm_documents fd
  JOIN farms f ON fd.farm_id = f.id
  WHERE fd.id = field_corrections.document_id 
  AND f.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_field_corrections_updated_at
BEFORE UPDATE ON public.field_corrections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();