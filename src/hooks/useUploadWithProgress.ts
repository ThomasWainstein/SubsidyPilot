import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { uploadToSupabaseWithProgress } from '@/utils/uploadProgress';

interface UseUploadWithProgressProps {
  bucket: string;
  onSuccess?: (url: string, path: string) => void;
  onError?: (error: Error) => void;
}

export const useUploadWithProgress = ({ bucket, onSuccess, onError }: UseUploadWithProgressProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const uploadFile = async (file: File, path?: string) => {
    setIsUploading(true);
    setProgress(0);
    setUploadedFile(null);

    try {
      const uploadPath = path || `${Date.now()}_${file.name}`;
      
      logger.debug('Starting upload with progress tracking', { 
        fileName: file.name, 
        bucket, 
        path: uploadPath 
      });

      const result = await uploadToSupabaseWithProgress(
        file,
        bucket,
        uploadPath,
        supabase,
        (progressPercent) => {
          setProgress(progressPercent);
          logger.debug('Upload progress', { fileName: file.name, progress: progressPercent });
        }
      );

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadPath);

      setUploadedFile(urlData.publicUrl);
      setProgress(100);
      
      logger.success('Upload completed with progress tracking', { 
        fileName: file.name, 
        url: urlData.publicUrl 
      });

      toast({
        title: 'Upload Successful',
        description: `${file.name} has been uploaded successfully`,
      });

      onSuccess?.(urlData.publicUrl, uploadPath);
      
      return {
        url: urlData.publicUrl,
        path: uploadPath,
        data: result
      };

    } catch (error) {
      const uploadError = error instanceof Error ? error : new Error('Upload failed');
      
      logger.error('Upload failed', uploadError, { fileName: file.name });
      
      toast({
        title: 'Upload Failed',
        description: uploadError.message,
        variant: 'destructive',
      });

      onError?.(uploadError);
      throw uploadError;
      
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setProgress(0);
    setUploadedFile(null);
    setIsUploading(false);
  };

  return {
    uploadFile,
    reset,
    isUploading,
    progress,
    uploadedFile,
  };
};

export default useUploadWithProgress;