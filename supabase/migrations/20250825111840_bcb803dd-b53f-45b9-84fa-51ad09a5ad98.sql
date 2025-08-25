-- Create new RLS policy for document_extractions to handle both farm and client documents
CREATE POLICY "Users can view extractions for both farm and client documents" 
ON document_extractions FOR SELECT
USING (
  -- Allow if document is in farm_documents and user owns the farm
  EXISTS (
    SELECT 1
    FROM farm_documents fd
    JOIN farms f ON fd.farm_id = f.id
    WHERE fd.id = document_extractions.document_id 
    AND f.user_id = auth.uid()
  )
  OR
  -- Allow if document is in client_documents and user owns the document
  EXISTS (
    SELECT 1
    FROM client_documents cd
    WHERE cd.id = document_extractions.document_id 
    AND cd.user_id = auth.uid()
  )
);

-- Now drop the old policy
DROP POLICY IF EXISTS "Users can view extractions for their documents" ON document_extractions;