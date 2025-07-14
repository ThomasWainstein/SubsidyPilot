
import { useState } from 'react';
import { useUploadDocument } from '@/hooks/useFarmDocuments';
import { toast } from '@/components/ui/use-toast';
import { validateDocumentUpload } from '@/utils/documentValidation';
import { isValidDocumentCategory, normalizeDocumentCategory } from '@/utils/documentValidation';
import { validateFileType, sanitizeFileName } from '@/utils/securityValidation';
import { supabase } from '@/integrations/supabase/client';

interface UseDocumentUploadProps {
  farmId: string;
  onSuccess?: (files: Array<{ documentId: string; fileName: string; fileUrl: string; category: string }>) => void;
  onExtractionCompleted?: (fileName: string, extraction: any) => void;
}

export const useDocumentUpload = ({ farmId, onSuccess, onExtractionCompleted }: UseDocumentUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const uploadMutation = useUploadDocument();

  const addFiles = (files: File[]) => {
    console.log(`📝 Processing ${files.length} files for upload validation`);
    const validFiles: File[] = [];
    
    files.forEach(file => {
      // Check file size first (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        console.error('❌ File size validation failed:', file.name, 'Size:', file.size);
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 50MB limit. Please choose a smaller file.`,
          variant: 'destructive',
        });
        return;
      }

      // Security validation
      console.log('🔄 Starting file validation for:', file.name, 'Type:', file.type, 'Size:', file.size);
      const securityCheck = validateFileType(file);
      if (!securityCheck.isValid) {
        console.error('❌ Security validation failed:', securityCheck.error);
        toast({
          title: 'File rejected',
          description: `${file.name}: ${securityCheck.error}`,
          variant: 'destructive',
        });
        return;
      }
      console.log('✅ Security validation passed for:', file.name);

      // Document validation
      console.log('🔄 Starting document validation for:', file.name);
      const validation = validateDocumentUpload(file, category || 'other');
      if (validation.isValid) {
        // Sanitize filename for security
        const sanitizedFile = new File([file], sanitizeFileName(file.name), { type: file.type });
        console.log('✅ Document validation passed, sanitized filename:', sanitizeFileName(file.name));
        validFiles.push(sanitizedFile);
      } else {
        console.error('❌ Document validation failed:', validation.errors);
        validation.errors.forEach(error => {
          toast({
            title: 'File validation failed',
            description: `${file.name}: ${error}`,
            variant: 'destructive',
          });
        });
      }
    });

    // Check total file limit
    if (selectedFiles.length + validFiles.length > 5) {
      toast({
        title: 'Too many files',
        description: `Maximum 5 files allowed per upload. You have ${selectedFiles.length} selected and tried to add ${validFiles.length} more.`,
        variant: 'destructive',
      });
      return;
    }

    if (validFiles.length > 0) {
      console.log(`✅ Added ${validFiles.length} valid files to upload queue`);
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    console.log('Upload initiated with category:', category);

    // Validate inputs
    if (selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one file to upload.',
        variant: 'destructive',
      });
      return;
    }

    if (!category || category.trim() === '') {
      toast({
        title: 'Category required',
        description: 'Please select a document category before uploading.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidDocumentCategory(category)) {
      console.error('Invalid category detected during upload:', category);
      toast({
        title: 'Invalid category',
        description: 'Please select a valid document category.',
        variant: 'destructive',
      });
      return;
    }

    if (!farmId || farmId.trim() === '') {
      toast({
        title: 'Farm ID missing',
        description: 'Unable to upload documents - farm ID is required.',
        variant: 'destructive',
      });
      return;
    }

    // Normalize category as a final safety check
    const normalizedCategory = normalizeDocumentCategory(category);
    console.log('Using normalized category for upload:', normalizedCategory);

    setUploadProgress(0);
    setUploadedFiles([]);
    const totalFiles = selectedFiles.length;
    const successfulUploads: Array<{ documentId: string; fileName: string; fileUrl: string; category: string }> = [];
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        console.log(`Uploading file ${i + 1}/${totalFiles}:`, file.name, 'Category:', normalizedCategory);
        
        // Final security validation before upload
        console.log('🔄 Final security validation before upload for:', file.name);
        const securityCheck = validateFileType(file);
        if (!securityCheck.isValid) {
          console.error('❌ Final security validation failed:', securityCheck.error);
          throw new Error(`Security validation failed for ${file.name}: ${securityCheck.error}`);
        }
        console.log('✅ Final security validation passed for:', file.name);
        
        // Validate each file before upload
        const validation = validateDocumentUpload(file, normalizedCategory);
        if (!validation.isValid) {
          throw new Error(`File validation failed for ${file.name}: ${validation.errors.join(', ')}`);
        }
        
        const uploadResult = await uploadMutation.mutateAsync({
          file,
          farmId,
          category: normalizedCategory,
        });
        
        // Trigger AI extraction for supported file types - FIXED file extension check
        const supportedExtensions = ['pdf', 'docx', 'xlsx', 'txt', 'csv'];
        const fileExtension = file.name.toLowerCase().split('.').pop();
        
        if (uploadResult?.document?.id && fileExtension && supportedExtensions.includes(fileExtension)) {
          console.log(`🤖 Triggering AI extraction for document: ${file.name} (${fileExtension})`);
          
          // Trigger extraction in background - don't await to avoid blocking upload
          const extractionPromise = supabase.functions.invoke('extract-document-data', {
            body: {
              documentId: uploadResult.document.id,
              fileUrl: uploadResult.document.file_url,
              fileName: file.name,
              documentType: normalizedCategory
            }
          });
          
          // Handle extraction result in background with proper error logging
          extractionPromise
            .then(({ data, error }) => {
              if (error) {
                console.error(`❌ AI extraction failed for ${file.name}:`, error);
                // Log failed extraction to database
                supabase.from('document_extractions').insert({
                  document_id: uploadResult.document.id,
                  extracted_data: { error: 'Extraction failed', details: error.message },
                  extraction_type: 'openai_gpt4o',
                  confidence_score: 0,
                  status: 'failed',
                  error_message: error.message
                }).then(({ error: insertError }) => {
                  if (insertError) {
                    console.error('Failed to log extraction error:', insertError);
                  }
                });
              } else {
                console.log(`✅ AI extraction completed for ${file.name}:`, data);
                if (data?.extractedData) {
                  onExtractionCompleted?.(file.name, data.extractedData);
                }
              }
            })
            .catch(error => {
              console.error(`❌ AI extraction error for ${file.name}:`, error);
              // Log exception to database
              supabase.from('document_extractions').insert({
                document_id: uploadResult.document.id,
                extracted_data: { error: 'Extraction exception', details: error.message },
                extraction_type: 'openai_gpt4o',
                confidence_score: 0,
                status: 'failed',
                error_message: error.message
              }).then(({ error: insertError }) => {
                if (insertError) {
                  console.error('Failed to log extraction exception:', insertError);
                }
              });
            });
        } else {
          console.log(`⏭️ Skipping AI extraction for ${file.name} (${fileExtension}) - not supported`);
        }
        
        // Track successful upload
        successfulUploads.push({
          documentId: uploadResult.document.id,
          fileName: file.name,
          fileUrl: uploadResult.document.file_url,
          category: normalizedCategory
        });
        
        setUploadProgress(((i + 1) / totalFiles) * 100);
        setUploadedFiles(prev => [...prev, file.name]);
      }

      // Clear form after successful upload
      setSelectedFiles([]);
      setCategory('');
      setUploadProgress(0);
      setUploadedFiles([]);
      
      console.log('✅ Upload completed successfully - form cleared');
      
      // Show success toast with file count
      toast({
        title: 'Upload successful',
        description: `${totalFiles} document${totalFiles > 1 ? 's' : ''} uploaded successfully.`,
      });
      
      onSuccess?.(successfulUploads);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(0);
      setUploadedFiles([]);
      
      // Show specific error message if available
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during upload';
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return {
    selectedFiles,
    category,
    setCategory: (newCategory: string) => {
      // Only set valid categories or empty string for clearing
      if (newCategory === '' || isValidDocumentCategory(newCategory)) {
        setCategory(newCategory);
      } else {
        console.warn('Attempted to set invalid category:', newCategory);
      }
    },
    uploadProgress,
    uploadedFiles,
    isUploading: uploadMutation.isPending,
    addFiles,
    removeFile,
    uploadFiles,
  };
};
