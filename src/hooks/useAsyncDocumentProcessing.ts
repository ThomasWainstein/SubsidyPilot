import { useState, useEffect } from 'react';
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
  estimated_completion: string;
}

interface UseAsyncProcessingOptions {
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
}

export const useAsyncDocumentProcessing = (options: UseAsyncProcessingOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { pollInterval = 2000 } = options;

  const startAsyncProcessing = async (
    documentId: string,
    fileUrl: string,
    fileName: string,
    clientType: string,
    documentType?: string
  ) => {
    setIsProcessing(true);
    setError(null);
    setProcessingJob(null);

    try {
      console.log('🚀 Starting async document processing...');

      // Call async processor
      const { data, error: processingError } = await supabase.functions.invoke(
        'async-document-processor',
        {
          body: {
            documentId,
            fileUrl,
            fileName,
            clientType,
            documentType,
            userId: (await supabase.auth.getUser()).data.user?.id
          }
        }
      );

      if (processingError || !data?.success) {
        throw new Error(processingError?.message || data?.error || 'Failed to start processing');
      }

      toast.success(`Document queued for processing (Job: ${data.jobId})`);
      
      // Start polling for status
      pollJobStatus(documentId);

      return data.jobId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start processing';
      setError(errorMessage);
      setIsProcessing(false);
      toast.error(`Processing failed: ${errorMessage}`);
      options.onError?.(errorMessage);
      throw err;
    }
  };

  const pollJobStatus = async (documentId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_processing_job_status', {
        p_document_id: documentId
      });

      if (error) {
        console.error('Failed to get job status:', error);
        return;
      }

      if (data && data.length > 0) {
        const job = data[0] as ProcessingJob;
        setProcessingJob(job);

        console.log(`📊 Job ${job.job_id}: ${job.status} (${job.progress_percentage}%)`);

        if (job.status === 'completed') {
          setIsProcessing(false);
          toast.success('Document processing completed successfully!');
          
          // Get the extraction results
          const { data: extractionData } = await supabase
            .from('document_extractions')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          options.onComplete?.(extractionData);
          return;
          
        } else if (job.status === 'failed') {
          setIsProcessing(false);
          const errorMsg = job.error_message || 'Processing failed';
          setError(errorMsg);
          toast.error(`Processing failed: ${errorMsg}`);
          options.onError?.(errorMsg);
          return;
        }
      }

      // Continue polling if still processing
      if (isProcessing) {
        setTimeout(() => pollJobStatus(documentId), pollInterval);
      }

    } catch (err) {
      console.error('Error polling job status:', err);
      setTimeout(() => pollJobStatus(documentId), pollInterval * 2); // Longer interval on error
    }
  };

  const cancelProcessing = () => {
    setIsProcessing(false);
    setProcessingJob(null);
    setError(null);
  };

  // Real-time updates for job status
  useEffect(() => {
    if (!processingJob?.job_id) return;

    const channel = supabase
      .channel('processing-job-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_processing_jobs',
          filter: `id=eq.${processingJob.job_id}`
        },
        (payload) => {
          console.log('🔄 Real-time job update:', payload.new);
          const updatedJob = payload.new as any;
          
          setProcessingJob({
            job_id: updatedJob.id,
            status: updatedJob.status,
            priority: updatedJob.priority,
            progress_percentage: getProgressPercentage(updatedJob.status),
            error_message: updatedJob.error_message,
            processing_time_ms: updatedJob.processing_time_ms,
            created_at: updatedJob.created_at,
            updated_at: updatedJob.updated_at,
            estimated_completion: updatedJob.completed_at || updatedJob.scheduled_for
          });

          if (updatedJob.status === 'completed') {
            setIsProcessing(false);
            toast.success('Processing completed!');
          } else if (updatedJob.status === 'failed') {
            setIsProcessing(false);
            setError(updatedJob.error_message || 'Processing failed');
            toast.error(`Processing failed: ${updatedJob.error_message || 'Unknown error'}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processingJob?.job_id]);

  return {
    startAsyncProcessing,
    isProcessing,
    processingJob,
    error,
    cancelProcessing,
    progressPercentage: processingJob?.progress_percentage || 0,
    estimatedCompletion: processingJob?.estimated_completion,
    jobId: processingJob?.job_id
  };
};

function getProgressPercentage(status: string): number {
  switch (status) {
    case 'completed': return 100;
    case 'processing': return 75;
    case 'queued': return 25;
    case 'failed': return 0;
    default: return 50;
  }
}