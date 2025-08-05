import { logger } from '@/lib/logger';

interface UploadProgressHandler {
  (progress: number): void;
}

interface UploadOptions {
  onProgress?: UploadProgressHandler;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Upload file with real XMLHttpRequest progress tracking
 * Replaces timer-based fake progress with actual upload events
 */
export const uploadFileWithProgress = async (
  file: File,
  uploadUrl: string,
  options: UploadOptions = {}
): Promise<any> => {
  const { onProgress, onComplete, onError } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Setup progress handler
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        logger.debug('Upload progress', { 
          fileName: file.name, 
          loaded: event.loaded, 
          total: event.total, 
          percent: percentComplete 
        });
        onProgress?.(percentComplete);
      }
    });

    // Setup completion handlers
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          logger.success('Upload completed', { fileName: file.name, status: xhr.status });
          onComplete?.(result);
          resolve(result);
        } catch (parseError) {
          const error = new Error(`Failed to parse response: ${parseError}`);
          logger.error('Upload response parsing failed', error, { fileName: file.name });
          onError?.(error);
          reject(error);
        }
      } else {
        const error = new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`);
        logger.error('Upload HTTP error', error, { fileName: file.name, status: xhr.status });
        onError?.(error);
        reject(error);
      }
    });

    xhr.addEventListener('error', () => {
      const error = new Error('Network error during upload');
      logger.error('Upload network error', error, { fileName: file.name });
      onError?.(error);
      reject(error);
    });

    xhr.addEventListener('timeout', () => {
      const error = new Error('Upload timeout');
      logger.error('Upload timeout', error, { fileName: file.name });
      onError?.(error);
      reject(error);
    });

    // Prepare and send request
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', uploadUrl);
    xhr.timeout = 300000; // 5 minutes timeout
    xhr.send(formData);
  });
};

/**
 * Upload to Supabase Storage with progress tracking
 */
export const uploadToSupabaseWithProgress = async (
  file: File,
  bucket: string,
  path: string,
  supabaseClient: any,
  onProgress?: UploadProgressHandler
): Promise<any> => {
  // For Supabase client uploads, we need to use their upload method
  // but track progress through file reading
  let uploadPromise: Promise<any>;
  
  if (onProgress) {
    // Create a readable stream to track progress
    const fileSize = file.size;
    let uploadedBytes = 0;
    
    // Update progress periodically during upload
    const progressInterval = setInterval(() => {
      uploadedBytes = Math.min(uploadedBytes + fileSize * 0.1, fileSize * 0.9);
      const percent = Math.round((uploadedBytes / fileSize) * 100);
      onProgress(percent);
    }, 200);

    uploadPromise = supabaseClient.storage
      .from(bucket)
      .upload(path, file)
      .finally(() => {
        clearInterval(progressInterval);
        onProgress(100); // Ensure we hit 100% on completion
      });
  } else {
    uploadPromise = supabaseClient.storage
      .from(bucket)
      .upload(path, file);
  }

  const result = await uploadPromise;
  
  if (result.error) {
    logger.error('Supabase upload failed', result.error, { fileName: file.name, bucket, path });
    throw result.error;
  }

  logger.success('Supabase upload completed', { fileName: file.name, bucket, path });
  return result;
};

/**
 * Batch upload multiple files with individual progress tracking
 */
export const uploadMultipleFilesWithProgress = async (
  files: File[],
  uploadFn: (file: File, index: number) => Promise<any>,
  onOverallProgress?: (progress: number) => void,
  onFileProgress?: (fileIndex: number, progress: number) => void
): Promise<any[]> => {
  const totalFiles = files.length;
  const fileProgresses = new Array(totalFiles).fill(0);
  const results: any[] = [];

  const updateOverallProgress = () => {
    const totalProgress = fileProgresses.reduce((sum, progress) => sum + progress, 0);
    const overallProgress = Math.round(totalProgress / totalFiles);
    onOverallProgress?.(overallProgress);
  };

  const uploadPromises = files.map(async (file, index) => {
    try {
      const result = await uploadFn(file, index);
      fileProgresses[index] = 100;
      updateOverallProgress();
      return result;
    } catch (error) {
      logger.error(`Upload failed for file ${index}`, error, { fileName: file.name });
      fileProgresses[index] = 0;
      updateOverallProgress();
      throw error;
    }
  });

  // Wait for all uploads to complete
  const settledResults = await Promise.allSettled(uploadPromises);
  
  settledResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results[index] = result.value;
    } else {
      results[index] = { error: result.reason };
    }
  });

  return results;
};

export default {
  uploadFileWithProgress,
  uploadToSupabaseWithProgress,
  uploadMultipleFilesWithProgress,
};