/**
 * Hook for async document processing with job queue
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProcessingJob {
  job_id: string;
  status: string;
  priority: string;
  progress_percentage: number;
  error_message?: string;
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
}

interface UseAsyncProcessingOptions {
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

export const useAsyncProcessing = (options: UseAsyncProcessingOptions = {}) => {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { onComplete, onError, pollInterval = 2000 } = options;

  const createProcessingJob = useCallback(async (
    documentId: string,
    fileUrl: string,
    fileName: string,
    clientType: string = 'individual',
    documentType?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      console.log('🚀 Creating async processing job...');

      const { data: jobData, error: jobError } = await supabase
        .from('document_processing_jobs')
        .insert({
          document_id: documentId,
          file_url: fileUrl,
          file_name: fileName,
          client_type: clientType,
          document_type: documentType,
          status: 'queued',
          priority: priority,
          config: {
            includeOCR: true,
            confidenceThreshold: 0.7,
            extractTables: true,
            extractImages: false
          },
          metadata: {
            created_via: 'async-processing-hook',
            client_type: clientType,
            file_size: 0 // Will be updated by processor
          },
          retry_attempt: 0,
          max_retries: 3,
          scheduled_for: new Date().toISOString()
        })
        .select()
        .single();

      if (jobError) {
        throw new Error(`Failed to create processing job: ${jobError.message}`);
      }

      console.log('✅ Processing job created:', jobData.id);
      
      // Trigger the async processor
      supabase.functions.invoke('async-document-processor', {
        body: { trigger: 'job_created' }
      }).catch(err => {
        console.warn('Failed to trigger processor (will run on schedule):', err);
      });

      toast.success('Document queued for processing');
      
      // Start polling for status
      startPolling(documentId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      console.error('❌ Failed to create processing job:', err);
      setError(errorMessage);
      setIsProcessing(false);
      onError?.(errorMessage);
    }
  }, [onError]);

  const startPolling = useCallback((documentId: string) => {
    const pollStatus = async () => {
      try {
        const { data: jobStatus, error: statusError } = await supabase
          .rpc('get_processing_job_status', { p_document_id: documentId });

        if (statusError) {
          console.error('Error polling job status:', statusError);
          return;
        }

        if (jobStatus && jobStatus.length > 0) {
          const currentJob = jobStatus[0];
          setJob(currentJob);

          if (currentJob.status === 'completed') {
            console.log('✅ Processing completed');
            setIsProcessing(false);
            
            // Fetch extraction results
            const { data: extraction, error: extractionError } = await supabase
              .from('document_extractions')
              .select('extracted_data')
              .eq('document_id', documentId)
              .single();

            if (!extractionError && extraction) {
              setResult(extraction.extracted_data);
              onComplete?.(extraction.extracted_data);
            }
            
            clearInterval(pollInterval);
            
          } else if (currentJob.status === 'failed') {
            console.log('❌ Processing failed');
            setIsProcessing(false);
            setError(currentJob.error_message || 'Processing failed');
            onError?.(currentJob.error_message || 'Processing failed');
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Initial poll
    pollStatus();
    
    // Set up polling interval
    const intervalId = setInterval(pollStatus, pollInterval);
    
    // Cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(intervalId);
      if (isProcessing) {
        setError('Processing timeout - please check status manually');
        setIsProcessing(false);
      }
    }, 600000);
    
    return intervalId;
  }, [isProcessing, onComplete, onError, pollInterval]);

  // Real-time updates via Supabase subscription
  useEffect(() => {
    if (!job?.job_id) return;

    const subscription = supabase
      .channel(`job-${job.job_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_processing_jobs',
          filter: `id=eq.${job.job_id}`
        },
        (payload) => {
          console.log('📡 Real-time job update:', payload.new);
          // Update job status immediately
          const updatedJob = payload.new as any;
          setJob(prev => prev ? {
            ...prev,
            status: updatedJob.status,
            progress_percentage: updatedJob.status === 'completed' ? 100 : 
                                updatedJob.status === 'processing' ? 75 : 25,
            error_message: updatedJob.error_message,
            processing_time_ms: updatedJob.processing_time_ms,
            updated_at: updatedJob.updated_at
          } : null);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [job?.job_id]);

  const getProgressPercentage = useCallback(() => {
    if (!job) return 0;
    return job.progress_percentage || 0;
  }, [job]);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (!job || !job.estimated_completion) return null;
    
    const now = new Date();
    const completion = new Date(job.estimated_completion);
    const remaining = Math.max(0, completion.getTime() - now.getTime());
    
    return Math.ceil(remaining / 1000); // seconds
  }, [job]);

  return {
    createProcessingJob,
    job,
    isProcessing,
    result,
    error,
    progressPercentage: getProgressPercentage(),
    estimatedTimeRemaining: getEstimatedTimeRemaining(),
    status: job?.status || 'idle'
  };
};