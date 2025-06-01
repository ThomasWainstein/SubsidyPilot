
import { useState } from 'react';
import { useUploadDocument } from '@/hooks/useFarmDocuments';
import { toast } from '@/components/ui/use-toast';
import { validateFile, type ValidationResult } from '@/utils/fileValidation';

interface UseDocumentUploadProps {
  farmId: string;
  onSuccess?: () => void;
}

// Valid document categories that match the database enum
const VALID_CATEGORIES = ['legal', 'financial', 'environmental', 'technical', 'certification', 'other'];

export const useDocumentUpload = ({ farmId, onSuccess }: UseDocumentUploadProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const uploadMutation = useUploadDocument();

  const addFiles = (files: File[]) => {
    const validFiles: File[] = [];
    
    files.forEach(file => {
      const validation: ValidationResult = validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
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
        description: 'Please select a document category.',
        variant: 'destructive',
      });
      return;
    }

    if (!VALID_CATEGORIES.includes(category)) {
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

    setUploadProgress(0);
    setUploadedFiles([]);
    const totalFiles = selectedFiles.length;
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await uploadMutation.mutateAsync({
          file,
          farmId,
          category,
        });
        setUploadProgress(((i + 1) / totalFiles) * 100);
        setUploadedFiles(prev => [...prev, file.name]);
      }

      // Clear form after successful upload
      setSelectedFiles([]);
      setCategory('');
      setUploadProgress(0);
      setUploadedFiles([]);
      
      onSuccess?.();
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(0);
      setUploadedFiles([]);
    }
  };

  return {
    selectedFiles,
    category,
    setCategory: (newCategory: string) => {
      // Only set valid categories
      if (newCategory === '' || VALID_CATEGORIES.includes(newCategory)) {
        setCategory(newCategory);
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
