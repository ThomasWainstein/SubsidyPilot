-- Add document classification tracking to farm_documents table
ALTER TABLE farm_documents 
ADD COLUMN predicted_category text,
ADD COLUMN prediction_confidence numeric(3,2),
ADD COLUMN category_agreement boolean DEFAULT NULL,
ADD COLUMN classification_model text DEFAULT 'huggingface-distilbert',
ADD COLUMN classification_timestamp timestamp with time zone;

-- Add classification logs table for training data
CREATE TABLE document_classification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid NOT NULL,
  predicted_category text NOT NULL,
  user_selected_category text NOT NULL,
  prediction_confidence numeric(3,2) NOT NULL,
  model_used text NOT NULL,
  document_text_preview text,
  agrees boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  FOREIGN KEY (document_id) REFERENCES farm_documents(id) ON DELETE CASCADE
);

-- Enable RLS on classification logs
ALTER TABLE document_classification_logs ENABLE ROW LEVEL SECURITY;

-- Users can view classification logs for their documents
CREATE POLICY "Users can view classification logs for their documents" 
ON document_classification_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM farm_documents fd 
  JOIN farms f ON fd.farm_id = f.id 
  WHERE fd.id = document_classification_logs.document_id 
  AND f.user_id = auth.uid()
));

-- Service role can manage classification logs
CREATE POLICY "Service role can manage classification logs" 
ON document_classification_logs 
FOR ALL 
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);