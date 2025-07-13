-- Create document_extractions table for storing AI extraction results
CREATE TABLE IF NOT EXISTS public.document_extractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  extracted_data JSONB NOT NULL,
  extraction_type VARCHAR(50) NOT NULL DEFAULT 'openai_gpt4o',
  confidence_score DECIMAL(3,2) DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

-- Create policies for document extractions
CREATE POLICY "Users can view extractions for their documents" 
ON public.document_extractions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.farm_documents fd
    JOIN public.farms f ON fd.farm_id = f.id
    WHERE fd.id = document_extractions.document_id
    AND f.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all extractions" 
ON public.document_extractions 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Add foreign key constraint
ALTER TABLE public.document_extractions 
ADD CONSTRAINT fk_document_extractions_document_id 
FOREIGN KEY (document_id) REFERENCES public.farm_documents(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_document_extractions_document_id ON public.document_extractions(document_id);
CREATE INDEX idx_document_extractions_status ON public.document_extractions(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_document_extractions_updated_at
BEFORE UPDATE ON public.document_extractions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();