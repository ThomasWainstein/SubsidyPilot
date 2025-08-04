import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface TempDocument {
  id: string;
  file: File;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url?: string;
  upload_progress: number;
  upload_status: 'idle' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  classification_status: 'pending' | 'processing' | 'completed' | 'failed';
  predicted_category?: string;
  confidence?: number;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_data?: any;
  extraction_id?: string;
  error_message?: string;
  retry_count?: number;
  created_at: string;
  last_updated: string;
  validation_errors?: string[];
  can_retry?: boolean;
  upload_controller?: () => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface ExtractionStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

interface UploadController {
  abort: () => void;
  promise: Promise<string>;
}

const STORAGE_KEY = 'temp_farm_documents';
const MAX_RETRY_COUNT = 3;
const POLLING_INTERVAL = 2000; // Poll every 2 seconds
const MAX_CONCURRENT_UPLOADS = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'text/plain'
];

export const useTempDocumentUpload = () => {
  const [documents, setDocuments] = useState<TempDocument[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
    setIsInitialized(true);
  }, []);

  // Persist state whenever documents change
  useEffect(() => {
    if (isInitialized) {
      persistState();
    }
  }, [documents, isInitialized]);

  // Auto-cleanup completed documents after some time
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setDocuments(prev => prev.filter(doc => {
        const age = now - new Date(doc.created_at).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        return age < maxAge || doc.upload_status !== 'completed';
      }));
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(cleanup);
  }, []);

  const loadPersistedState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Filter out old documents and recreate File objects if needed
        const validDocs = parsed.filter((doc: any) => {
          const age = Date.now() - new Date(doc.created_at).getTime();
          return age < 24 * 60 * 60 * 1000; // Keep only last 24 hours
        });
        setDocuments(validDocs);
      }
    } catch (error) {
      console.warn('Failed to load persisted documents:', error);
    }
  };

  const persistState = () => {
    try {
      // Don't persist File objects, just metadata
      const persistable = documents.map(({ file, ...doc }) => ({
        ...doc,
        file_info: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch (error) {
      console.warn('Failed to persist documents state:', error);
    }
  };

  // File validation utility
  const validateFile = useCallback((file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size exceeds ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit`);
    }
    
    // Type validation
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      errors.push(`File type "${file.type}" is not supported`);
    }
    
    // Name validation
    if (file.name.length > 255) {
      errors.push('File name is too long');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // ---- CONFLICT-FREE UPLOAD CONTROLLER ----
  // Upload with proper progress tracking using Supabase
  const createUploadController = useCallback(
    (documentId: string, file: File): UploadController => {
      const controller = new AbortController();

      const promise = new Promise<string>((resolve, reject) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `temp-farm-creation/${documentId}.${fileExt}`;

        // Handle abort signal
        controller.signal.addEventListener('abort', () => {
          reject(new Error('Upload cancelled by user'));
        });

        // Simulate progress tracking for better UX
        const simulateProgress = () => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 90) {
              clearInterval(interval);
              return;
            }

            updateDocument(documentId, {
              upload_progress: Math.min(90, Math.round(progress)),
              last_updated: new Date().toISOString()
            });
          }, 200);

          return interval;
        };

        const progressInterval = simulateProgress();

        // Upload using Supabase storage
        supabase.storage
          .from('farm-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(({ data, error }) => {
            clearInterval(progressInterval);

            if (controller.signal.aborted) {
              reject(new Error('Upload cancelled'));
              return;
            }

            if (error) {
              reject(new Error(error.message));
            } else {
              // Complete progress
              updateDocument(documentId, {
                upload_progress: 100,
                last_updated: new Date().toISOString()
              });
              resolve(data.path);
            }
          })
          .catch((error) => {
            clearInterval(progressInterval);
            reject(error);
          });
      });

      return { abort: () => controller.abort(), promise };
    },
    []
  );
  // ---- END UPLOAD CONTROLLER ----

  // Enhanced upload with real progress and cancellation. Returns the public URL
  // of the uploaded file so the caller can continue processing (e.g. create a
  // database record).
  const uploadFile = async (documentId: string, file: File): Promise<string | undefined> => {
    logger.debug('Starting enhanced upload', { fileName: file.name });
    
    // Validate file first
    const validation = validateFile(file);
    if (!validation.isValid) {
      updateDocument(documentId, {
        upload_status: 'failed',
        error_message: validation.errors.join(', '),
        validation_errors: validation.errors,
        last_updated: new Date().toISOString()
      });
      
      toast({
        title: 'File Validation Failed',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    // Check concurrent upload limit
    if (activeUploads.size >= MAX_CONCURRENT_UPLOADS) {
      updateDocument(documentId, {
        upload_status: 'failed',
        error_message: 'Too many concurrent uploads. Please wait for others to complete.',
        last_updated: new Date().toISOString()
      });
      
      toast({
        title: 'Upload Queue Full',
        description: 'Please wait for other uploads to complete before starting new ones.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Add to active uploads
      setActiveUploads(prev => new Set([...prev, documentId]));
      
      updateDocument(documentId, {
        upload_status: 'uploading',
        upload_progress: 0,
        error_message: undefined,
        validation_errors: undefined,
        last_updated: new Date().toISOString()
      });

      // Create upload controller for cancellation
      const uploadController = createUploadController(documentId, file);
      
      updateDocument(documentId, {
        upload_controller: uploadController.abort // Store abort function
      });
      const filePath = await uploadController.promise;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(filePath);

      updateDocument(documentId, {
        file_url: publicUrl,
        upload_progress: 100,
        upload_status: 'completed',
        classification_status: 'pending',
        extraction_status: 'pending',
        last_updated: new Date().toISOString()
      });

      logger.debug('Upload completed', { filePath });

      return publicUrl;

    } catch (error) {
      console.error('💥 Upload failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      const isCancelled = errorMessage.includes('cancelled') || errorMessage.includes('abort');
      
      updateDocument(documentId, {
        upload_status: isCancelled ? 'cancelled' : 'failed',
        classification_status: 'failed',
        extraction_status: 'failed',
        error_message: errorMessage,
        can_retry: !isCancelled,
        last_updated: new Date().toISOString()
      });

      if (!isCancelled) {
        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${file.name}. ${errorMessage}`,
          variant: 'destructive',
        });
      }
    } finally {
      // Remove from active uploads
      setActiveUploads(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  };

  // ---- STATE MANAGEMENT HELPERS ----
  const updateDocument = useCallback((id: string, updates: Partial<TempDocument>) => {
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
  }, []);

  const addDocument = (file: File): string => {
    const tempId = `temp-${crypto.randomUUID()}`;
    const newDoc: TempDocument = {
      id: tempId,
      file,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      upload_progress: 0,
      upload_status: 'idle',
      classification_status: 'pending',
      extraction_status: 'pending',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };
    setDocuments(prev => [...prev, newDoc]);
    return tempId;
  };

  // Create document record after upload and trigger extraction
  const processDocument = async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    if (!doc) return;

    try {
      // Upload file if not already uploaded
      let fileUrl = doc.file_url;
      if (!fileUrl) {
        fileUrl = await uploadFile(documentId, doc.file);
      }
      if (!fileUrl) throw new Error('Failed to upload file');

      // Skip creating database record for temp documents during the upload process
      // We'll use the temp ID until the final farm is created
      updateDocument(documentId, {
        extraction_status: 'processing',
        last_updated: new Date().toISOString()
      });

      const { data: extractionData, error: extractionError } = await supabase.functions.invoke('extract-document-data', {
        body: {
          documentId: documentId, // Use temp ID for now
          fileUrl,
          fileName: doc.file_name
        }
      });

      if (extractionError) {
        throw new Error(extractionError.message);
      }

      updateDocument(documentId, {
        extraction_status: 'completed',
        extraction_data: extractionData,
        extraction_id: documentId, // Store temp ID as extraction ID
        last_updated: new Date().toISOString()
      });


    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      updateDocument(documentId, {
        extraction_status: 'failed',
        error_message: message,
        last_updated: new Date().toISOString()
      });
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const getExtractedData = () =>
    documents.filter(d => d.extraction_status === 'completed' && d.extraction_data).map(d => d.extraction_data);

  const getCompletedDocuments = () =>
    documents.filter(d => d.extraction_status === 'completed');

  const isProcessing = documents.some(
    d => d.upload_status === 'uploading' || d.classification_status === 'processing' || d.extraction_status === 'processing'
  );

  return {
    documents,
    addDocument,
    processDocument,
    removeDocument,
    getExtractedData,
    getCompletedDocuments,
    isProcessing,
    updateDocument
  };
};


