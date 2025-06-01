
import { useState } from 'react';
import { useUploadDocument } from '@/hooks/useFarmDocuments';
import { toast } from '@/components/ui/use-toast';
import { validateFile, type ValidationResult } from '@/utils/fileValidation';

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
    if (selectedFiles.length === 0 || !category) {
      toast({
        title: 'Missing information',
        description: 'Please select files and a category before uploading.',
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
    setCategory,
    uploadProgress,
    uploadedFiles,
    isUploading: uploadMutation.isPending,
    addFiles,
    removeFile,
    uploadFiles,
  };
};
