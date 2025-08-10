-- Fix critical RLS security issues for new tables

-- Enable RLS on parsing_profiles
ALTER TABLE parsing_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for parsing_profiles
CREATE POLICY "Authenticated users can view parsing profiles" 
ON parsing_profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage parsing profiles" 
ON parsing_profiles FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on document_extraction_reviews  
ALTER TABLE document_extraction_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_extraction_reviews
CREATE POLICY "Users can view reviews for their documents" 
ON document_extraction_reviews FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM document_extractions de
  JOIN farm_documents fd ON de.document_id = fd.id
  JOIN farms f ON fd.farm_id = f.id
  WHERE de.id = document_extraction_reviews.extraction_id 
  AND f.user_id = auth.uid()
));

CREATE POLICY "Service role can manage extraction reviews" 
ON document_extraction_reviews FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on extraction_batches
ALTER TABLE extraction_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for extraction_batches
CREATE POLICY "Users can view their own batches" 
ON extraction_batches FOR SELECT 
USING (owner_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Users can create their own batches" 
ON extraction_batches FOR INSERT 
WITH CHECK (owner_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Service role can manage all batches" 
ON extraction_batches FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');