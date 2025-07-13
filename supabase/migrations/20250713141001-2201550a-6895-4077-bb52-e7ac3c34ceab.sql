-- Update storage bucket to be public for easier access to farm documents
UPDATE storage.buckets 
SET public = true 
WHERE name = 'farm-documents';

-- Create storage policies for farm documents bucket
-- Allow authenticated users to view documents
CREATE POLICY "Authenticated users can view farm documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'farm-documents' AND auth.role() = 'authenticated');

-- Allow users to upload documents to their own farm folders
CREATE POLICY "Users can upload documents to their farm folders" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'farm-documents' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM farms WHERE user_id = auth.uid()
  )
);

-- Allow users to update documents in their own farm folders
CREATE POLICY "Users can update their farm documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'farm-documents' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM farms WHERE user_id = auth.uid()
  )
);

-- Allow users to delete documents from their own farm folders
CREATE POLICY "Users can delete their farm documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'farm-documents' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM farms WHERE user_id = auth.uid()
  )
);