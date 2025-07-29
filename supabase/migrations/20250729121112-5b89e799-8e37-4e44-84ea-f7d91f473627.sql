-- Create document_extraction_reviews table for audit trail
CREATE TABLE public.document_extraction_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  extraction_id UUID NOT NULL REFERENCES public.document_extractions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  original_data JSONB NOT NULL,
  corrected_data JSONB NOT NULL,
  reviewer_notes TEXT,
  review_status TEXT NOT NULL DEFAULT 'reviewed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_extraction_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for document_extraction_reviews
CREATE POLICY "Users can view reviews for their documents" 
ON public.document_extraction_reviews 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM document_extractions de
    JOIN farm_documents fd ON de.document_id = fd.id
    JOIN farms f ON fd.farm_id = f.id
    WHERE de.id = document_extraction_reviews.extraction_id 
    AND f.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create reviews for their documents" 
ON public.document_extraction_reviews 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM document_extractions de
    JOIN farm_documents fd ON de.document_id = fd.id
    JOIN farms f ON fd.farm_id = f.id
    WHERE de.id = document_extraction_reviews.extraction_id 
    AND f.user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_document_extraction_reviews_updated_at
BEFORE UPDATE ON public.document_extraction_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();