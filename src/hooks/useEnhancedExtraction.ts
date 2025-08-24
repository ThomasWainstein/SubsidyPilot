import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedExtractionOptions {
  onProgress?: (progress: number, stage: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onNeedsReview?: (extractionId: string) => void;
}

interface ExtractionResult {
  success: boolean;
  extractionId: string;
  confidence: number;
  needsReview: boolean;
  documentType: string;
  extractedFields: Record<string, any>;
  processingTime: number;
}

export const useEnhancedExtraction = (options: EnhancedExtractionOptions = {}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processDocument = useCallback(async (
    documentId: string,
    fileUrl: string,
    fileName: string,
    documentType?: string
  ): Promise<ExtractionResult> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setCurrentStage('Initializing');

    try {
      console.log('🚀 Starting enhanced document processing...');

      // Create processing job
      const jobData = {
        document_id: documentId,
        file_url: fileUrl,
        file_name: fileName,
        document_type: documentType || 'unknown',
        client_type: 'universal',
        priority: 'medium',
        status: 'queued',
        config: {
          enable_auto_retry: true,
          max_retries: 2,
          processing_tier: 'fast'
        },
        metadata: {
          created_by: 'enhanced_extraction_hook',
          processing_mode: 'real_time'
        }
      };

      console.log('📋 Creating processing job:', jobData);
      
      const { data: job, error: jobError } = await supabase
        .from('document_processing_jobs')
        .insert(jobData)
        .select('*')
        .single();

      if (jobError) {
        console.error('❌ Error creating job:', jobError);
        throw new Error(`Failed to create processing job: ${jobError.message}`);
      }

      console.log('✅ Processing job created:', job.id);
      
      // Immediately trigger the processor
      setCurrentStage('Starting Processing');
      setProgress(5);
      options.onProgress?.(5, 'Starting Processing');

      const { error: processorError } = await supabase.functions.invoke('streaming-job-processor', {
        body: { trigger: 'immediate', job_id: job.id }
      });

      if (processorError) {
        console.error('❌ Error triggering processor:', processorError);
        // Don't throw here - the job might still be processed by cron
        toast.warning('Processing started but may take longer than usual');
      }

      // Poll for completion
      const result = await pollForCompletion(job.id, documentId);
      
      setResult(result);
      
      if (result.needsReview) {
        options.onNeedsReview?.(result.extractionId);
        toast.info(`Document processed but needs manual review (${Math.round(result.confidence * 100)}% confidence)`);
      } else {
        toast.success(`Document processed successfully! (${Math.round(result.confidence * 100)}% confidence)`);
      }
      
      options.onComplete?.(result);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed';
      console.error('❌ Enhanced extraction error:', err);
      
      setError(errorMessage);
      options.onError?.(errorMessage);
      toast.error(`Processing failed: ${errorMessage}`);
      
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  const pollForCompletion = async (jobId: string, documentId: string): Promise<ExtractionResult> => {
    const maxAttempts = 60; // 5 minutes maximum
    const pollInterval = 5000; // 5 seconds
    let attempt = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        attempt++;
        
        try {
          // Check job status
          const { data: job, error: jobError } = await supabase
            .from('document_processing_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

          if (jobError) {
            reject(new Error(`Failed to check job status: ${jobError.message}`));
            return;
          }

          // Update progress based on job metadata
          const metadata = job.metadata as any;
          if (metadata?.progress) {
            const progressValue = Math.min(metadata.progress, 95);
            setProgress(progressValue);
            setCurrentStage(metadata.current_stage || 'Processing');
            options.onProgress?.(progressValue, metadata.current_stage || 'Processing');
          }

          // Check if job is completed
          if (job.status === 'completed') {
            console.log('✅ Job completed, fetching extraction result');
            
            // Get the extraction result
            const { data: extraction, error: extractionError } = await supabase
              .from('document_extractions')
              .select('*')
              .eq('document_id', documentId)
              .eq('source_table', 'universal')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (extractionError) {
              reject(new Error(`Failed to get extraction result: ${extractionError.message}`));
              return;
            }

            setProgress(100);
            setCurrentStage('Completed');
            options.onProgress?.(100, 'Completed');

            const extractedData = extraction.extracted_data as any;
            const result: ExtractionResult = {
              success: true,
              extractionId: extraction.id,
              confidence: extraction.confidence_score || 0,
              needsReview: extraction.status_v2 === 'completed' && extraction.confidence_score < 0.7,
              documentType: extractedData?.document_type || 'unknown',
              extractedFields: extractedData?.fields || {},
              processingTime: job.processing_time_ms || 0
            };

            resolve(result);
            return;
          }

          // Check if job failed
          if (job.status === 'failed') {
            reject(new Error(`Job failed: ${job.error_message || 'Unknown error'}`));
            return;
          }

          // Continue polling if not finished and within limits
          if (attempt < maxAttempts) {
            setTimeout(poll, pollInterval);
          } else {
            reject(new Error('Processing timeout - job did not complete within expected time'));
          }

        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  };

  const retryWithBetterModel = useCallback(async (extractionId: string) => {
    try {
      setIsProcessing(true);
      setCurrentStage('Retrying with Premium Model');
      
      // Get the original extraction and find related job
      const { data: extraction, error } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('id', extractionId)
        .single();

      if (error || !extraction) {
        throw new Error('Failed to find original extraction');
      }

      // Find the most recent job for this document
      const { data: recentJob } = await supabase
        .from('document_processing_jobs')
        .select('*')
        .eq('document_id', extraction.document_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!recentJob) {
        throw new Error('No processing job found for this document');
      }

      // Create a new job with premium tier
      const newJobData = {
        document_id: extraction.document_id,
        file_url: recentJob.file_url,
        file_name: recentJob.file_name,
        document_type: recentJob.document_type,
        client_type: 'universal',
        priority: 'high',
        status: 'queued',
        config: {
          enable_auto_retry: false,
          processing_tier: 'premium',
          retry_of: extractionId
        },
        metadata: {
          created_by: 'manual_retry',
          original_extraction_id: extractionId
        }
      };

      const { data: newJob, error: jobError } = await supabase
        .from('document_processing_jobs')
        .insert(newJobData)
        .select('*')
        .single();

      if (jobError) throw jobError;

      // Trigger immediate processing
      await supabase.functions.invoke('streaming-job-processor', {
        body: { trigger: 'immediate', job_id: newJob.id }
      });

      // Poll for new result
      const result = await pollForCompletion(newJob.id, extraction.document_id);
      
      toast.success('Document reprocessed with premium model');
      return result;

    } catch (error) {
      console.error('Retry failed:', error);
      toast.error('Failed to retry with better model');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    processDocument,
    retryWithBetterModel,
    isProcessing,
    currentStage,
    progress,
    result,
    error,
    hasResults: !!result,
    needsReview: result?.needsReview || false
  };
};