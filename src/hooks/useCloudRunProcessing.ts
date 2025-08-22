/**
 * Hook for Cloud Run document processing integration
 */
import { useState, useCallback } from 'react';
import { getCloudRunDocumentService, CloudRunProcessingRequest, CloudRunProcessingResponse } from '@/services/cloudRunDocumentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseCloudRunProcessingOptions {
  onComplete?: (result: CloudRunProcessingResponse) => void;
  onError?: (error: string) => void;
}

export const useCloudRunProcessing = (options: UseCloudRunProcessingOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CloudRunProcessingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cloudRunService = getCloudRunDocumentService();

  const processWithCloudRun = useCallback(async (
    documentId: string,
    fileUrl: string,
    fileName: string,
    documentType?: string
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Starting Cloud Run document processing...');
      setProgress(25);

      // Prepare request
      const request: CloudRunProcessingRequest = {
        documentId,
        fileUrl,
        fileName,
        documentType,
        extractionOptions: {
          includeOCR: true,
          confidenceThreshold: 0.7,
          extractTables: true,
          extractImages: false
        }
      };

      setProgress(50);

      // Process with Cloud Run
      const response = await cloudRunService.processDocument(request);
      setProgress(75);

      if (response.success && response.extractedData) {
        console.log('✅ Cloud Run processing successful');
        
        // Save results to Supabase
        const { error: saveError } = await supabase
          .from('document_extractions')
          .upsert({
            document_id: documentId,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            status_v2: 'completed',
            extracted_data: response.extractedData,
            confidence_score: response.confidence || 0,
            progress_metadata: {
              processing_time_ms: response.processingTime,
              extraction_method: 'cloud-run-advanced',
              model: response.metadata?.model,
              version: response.metadata?.version
            }
          });

        if (saveError) {
          console.error('Failed to save extraction results:', saveError);
          throw new Error('Failed to save extraction results');
        }

        setProgress(100);
        setResult(response);
        toast.success(`Document processed successfully! (${response.processingTime}ms)`);
        options.onComplete?.(response);
        
      } else {
        throw new Error(response.error || 'Processing failed');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      console.error('❌ Cloud Run processing error:', err);
      
      setError(errorMessage);
      toast.error(`Processing failed: ${errorMessage}`);
      options.onError?.(errorMessage);

      // Update document status to failed
      await supabase
        .from('document_extractions')
        .upsert({
          document_id: documentId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          status_v2: 'failed',
          extracted_data: {},
          failure_detail: errorMessage
        });

    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  const checkServiceHealth = useCallback(async () => {
    try {
      const health = await cloudRunService.healthCheck();
      return health;
    } catch (error) {
      console.error('Health check failed:', error);
      return { healthy: false, error: 'Health check failed' };
    }
  }, []);

  const getServiceInfo = useCallback(async () => {
    try {
      return await cloudRunService.getServiceInfo();
    } catch (error) {
      console.error('Failed to get service info:', error);
      return null;
    }
  }, []);

  return {
    processWithCloudRun,
    isProcessing,
    progress,
    result,
    error,
    checkServiceHealth,
    getServiceInfo
  };
};