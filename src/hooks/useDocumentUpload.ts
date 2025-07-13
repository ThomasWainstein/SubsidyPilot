
import { useState } from 'react';
import { useUploadDocument } from '@/hooks/useFarmDocuments';
import { toast } from '@/components/ui/use-toast';
import { validateDocumentUpload } from '@/utils/documentValidation';
import { isValidDocumentCategory, normalizeDocumentCategory } from '@/utils/documentValidation';
import { validateFileType, sanitizeFileName } from '@/utils/securityValidation';

interface UseDocumentUploadProps {
  farmId: string;
  onSuccess?: () => void;
}

export const useDocumentUpload = ({ farmId, onSuccess }: UseDocumentUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const uploadMutation = useUploadDocument();

  const addFiles = (files: File[]) => {
    const validFiles: File[] = [];
    
    files.forEach(file => {
      // Security validation first
      console.log('🔄 Starting file validation for:', file.name, 'Type:', file.type);
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

      // Then document validation
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
            title: 'File rejected',
            description: `${file.name}: ${error}`,
            variant: 'destructive',
          });
        });
      }
    });

    if (selectedFiles.length + validFiles.length > 5) {
      toast({
        title: 'Too many files',
        description: 'Maximum 5 files allowed per upload.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
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
        
        await uploadMutation.mutateAsync({
          file,
          farmId,
          category: normalizedCategory,
        });
        setUploadProgress(((i + 1) / totalFiles) * 100);
        setUploadedFiles(prev => [...prev, file.name]);
      }

      // Clear form after successful upload
      setSelectedFiles([]);
      setCategory('');
      setUploadProgress(0);
      setUploadedFiles([]);
      
      console.log('Upload completed successfully');
      onSuccess?.();
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
