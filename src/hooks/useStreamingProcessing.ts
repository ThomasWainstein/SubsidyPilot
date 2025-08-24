/**
 * Streaming Processing Hook with Real-time Updates
 * Phase 3: Multi-Stage Pipeline with Progressive Results
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime?: number;
  endTime?: number;
  results?: any;
  error?: string;
}

export interface StreamingProcessingState {
  jobId: string | null;
  overallProgress: number;
  currentStage: string | null;
  stages: ProcessingStage[];
  partialResults: { [key: string]: any };
  isComplete: boolean;
  error: string | null;
  totalProcessingTime: number;
  estimatedTimeRemaining: number;
}

interface UseStreamingProcessingOptions {
  onStageComplete?: (stage: ProcessingStage) => void;
  onPartialResults?: (results: any, stage: string) => void;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
}

export const useStreamingProcessing = (options: UseStreamingProcessingOptions = {}) => {
  const [state, setState] = useState<StreamingProcessingState>({
    jobId: null,
    overallProgress: 0,
    currentStage: null,
    stages: [],
    partialResults: {},
    isComplete: false,
    error: null,
    totalProcessingTime: 0,
    estimatedTimeRemaining: 0
  });

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastEventReceived, setLastEventReceived] = useState<number | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const startTimeRef = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize processing stages
  const initializeStages = useCallback(() => {
    const stages: ProcessingStage[] = [
      { id: 'upload', name: 'File Upload', status: 'pending', progress: 0 },
      { id: 'text-extraction', name: 'Text Extraction', status: 'pending', progress: 0 },
      { id: 'pattern-analysis', name: 'Pattern Analysis', status: 'pending', progress: 0 },
      { id: 'ai-processing', name: 'AI Processing', status: 'pending', progress: 0 },
      { id: 'data-merging', name: 'Data Merging', status: 'pending', progress: 0 },
      { id: 'validation', name: 'Validation', status: 'pending', progress: 0 }
    ];
    
    setState(prev => ({ ...prev, stages }));
    return stages;
  }, []);

  // Update stage status and progress
  const updateStage = useCallback((stageId: string, updates: Partial<ProcessingStage>) => {
    setState(prev => {
      const newStages = prev.stages.map(stage => 
        stage.id === stageId 
          ? { 
              ...stage, 
              ...updates,
              endTime: updates.status === 'completed' ? Date.now() : stage.endTime,
              startTime: updates.status === 'processing' && !stage.startTime ? Date.now() : stage.startTime
            }
          : stage
      );

      // Calculate overall progress
      const totalProgress = newStages.reduce((sum, stage) => sum + stage.progress, 0);
      const overallProgress = Math.round(totalProgress / newStages.length);

      // Find current stage
      const currentStage = newStages.find(s => s.status === 'processing')?.name || null;

      // Check if complete
      const isComplete = newStages.every(s => s.status === 'completed' || s.status === 'failed');

      // Calculate estimated time remaining
      const completedStages = newStages.filter(s => s.status === 'completed');
      const avgTimePerStage = completedStages.length > 0 
        ? completedStages.reduce((sum, stage) => {
            const time = stage.endTime && stage.startTime ? stage.endTime - stage.startTime : 0;
            return sum + time;
          }, 0) / completedStages.length
        : 5000; // Default 5s per stage

      const remainingStages = newStages.filter(s => s.status === 'pending').length;
      const estimatedTimeRemaining = remainingStages * avgTimePerStage;

      // Trigger stage completion callback
      if (updates.status === 'completed' && updates.results) {
        const completedStage = newStages.find(s => s.id === stageId);
        if (completedStage) {
          options.onStageComplete?.(completedStage);
          options.onPartialResults?.(updates.results, stageId);
        }
      }

      return {
        ...prev,
        stages: newStages,
        overallProgress,
        currentStage,
        isComplete,
        estimatedTimeRemaining,
        totalProcessingTime: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
        partialResults: updates.results 
          ? { ...prev.partialResults, [stageId]: updates.results }
          : prev.partialResults
      };
    });
  }, [options]);

  // Create streaming processing job
  const createStreamingJob = useCallback(async (
    documentId: string,
    fileUrl: string,
    fileName: string,
    clientType: string,
    documentType?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    try {
      console.log('🚀 Creating streaming processing job...');
      startTimeRef.current = Date.now();
      
      // Initialize stages
      const stages = initializeStages();
      
      // Update upload stage to processing
      updateStage('upload', { status: 'processing', progress: 50 });

      // Create the processing job
      const { data, error } = await supabase
        .from('document_processing_jobs')
        .insert({
          document_id: documentId,
          file_url: fileUrl,
          file_name: fileName,
          client_type: clientType,
          document_type: documentType,
          priority: priority,
          status: 'queued',
          config: { streaming: true },
          metadata: { 
            stages: stages.map(s => ({ id: s.id, name: s.name })),
            streaming_enabled: true
          }
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Streaming job created:', data.id);
      
      // Complete upload stage
      updateStage('upload', { status: 'completed', progress: 100 });
      
      setState(prev => ({ ...prev, jobId: data.id }));
      
      // Set up real-time subscription
      setupRealtimeSubscription(data.id, documentId);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to create streaming job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create job';
      setState(prev => ({ ...prev, error: errorMessage }));
      options.onError?.(errorMessage);
      throw error;
    }
  }, [initializeStages, updateStage, options]);

  // Setup realtime subscription for job updates with enhanced debugging and fallback
  const setupRealtimeSubscription = useCallback((jobId: string, documentId: string) => {
    console.log('📡 Setting up enhanced realtime subscription:', { jobId, documentId });
    
    const channel = supabase
      .channel(`job-and-doc-updates-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to ALL events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'document_processing_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('📨 Job update received:', {
            eventType: payload.eventType,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString()
          });
          setLastEventReceived(Date.now());
          handleJobUpdate(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_extractions',
          filter: `document_id=eq.${documentId}`
        },
        (payload) => {
          console.log('📨 Document extraction update:', {
            eventType: payload.eventType,
            new: payload.new,
            timestamp: new Date().toISOString()
          });
          setLastEventReceived(Date.now());
          handleExtractionUpdate(payload.new);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('❌ Subscription error:', err);
          setConnectionStatus('error');
        } else {
          console.log('✅ Subscription status:', status);
          setConnectionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
        }
      });

    channelRef.current = channel;
    
    // Set up fallback polling if no events are received within 5 seconds
    const fallbackTimer = setTimeout(() => {
      if (!lastEventReceived || (Date.now() - lastEventReceived) > 5000) {
        console.log('🔄 No real-time events received, starting fallback polling');
        startFallbackPolling(jobId, documentId);
      }
    }, 5000);
    
    // Store timer for cleanup
    pollingTimerRef.current = fallbackTimer;
  }, [lastEventReceived]);

  // Handle job status updates
  const handleJobUpdate = useCallback((jobData: any) => {
    console.log('🔄 Processing job update:', jobData.status);
    
    switch (jobData.status) {
      case 'processing':
        updateStage('text-extraction', { status: 'processing', progress: 25 });
        break;
        
      case 'completed':
        // Complete all remaining stages
        updateStage('validation', { status: 'completed', progress: 100 });
        setState(prev => ({ ...prev, isComplete: true }));
        options.onComplete?.(jobData);
        break;
        
      case 'failed':
        const currentStageId = state.stages.find(s => s.status === 'processing')?.id || 'ai-processing';
        updateStage(currentStageId, { 
          status: 'failed', 
          error: jobData.error_message,
          progress: 0 
        });
        setState(prev => ({ ...prev, error: jobData.error_message }));
        options.onError?.(jobData.error_message);
        break;
    }

    // Handle metadata updates for progress
    if (jobData.metadata) {
      handleMetadataUpdate(jobData.metadata);
    }
  }, [state.stages, updateStage, options]);

  // Handle extraction updates
  const handleExtractionUpdate = useCallback((extractionData: any) => {
    if (extractionData.progress_metadata) {
      handleMetadataUpdate(extractionData.progress_metadata);
    }

    // Update stages based on extraction method
    const method = extractionData.progress_metadata?.extraction_method;
    if (method) {
      if (method.includes('pattern')) {
        updateStage('pattern-analysis', { 
          status: 'completed', 
          progress: 100,
          results: extractionData.extracted_data 
        });
      }
      
      if (method.includes('ai')) {
        updateStage('ai-processing', { 
          status: 'completed', 
          progress: 100,
          results: extractionData.extracted_data 
        });
      }
      
      updateStage('data-merging', { status: 'processing', progress: 75 });
    }
  }, [updateStage]);

  // Handle metadata updates for fine-grained progress
  const handleMetadataUpdate = useCallback((metadata: any) => {
    if (metadata.pattern_extraction_time) {
      updateStage('pattern-analysis', { status: 'completed', progress: 100 });
      updateStage('ai-processing', { status: 'processing', progress: 0 });
    }
    
    if (metadata.ai_processing_time) {
      updateStage('ai-processing', { status: 'completed', progress: 100 });
      updateStage('data-merging', { status: 'processing', progress: 50 });
    }
    
    if (metadata.processing_method === 'pattern-only') {
      // Skip AI processing for pattern-only extractions
      updateStage('ai-processing', { status: 'completed', progress: 100 });
      updateStage('data-merging', { status: 'processing', progress: 75 });
    }
  }, [updateStage]);

  // Fallback polling mechanism
  const startFallbackPolling = useCallback((jobId: string, documentId: string) => {
    console.log('🔄 Starting fallback polling for job:', jobId);
    
    fallbackPollingRef.current = setInterval(async () => {
      console.log('📊 Polling job status:', jobId);
      
      const { data: jobData, error: jobError } = await supabase
        .from('document_processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (jobData && !jobError) {
        console.log('📊 Polled job status:', jobData.status, 'metadata:', jobData.metadata);
        
        // Update local state with polled data
        if (jobData.metadata && typeof jobData.metadata === 'object' && 'stage' in jobData.metadata && 'progress' in jobData.metadata) {
          const metadata = jobData.metadata as any;
          updateStage(metadata.stage, {
            status: 'processing',
            progress: metadata.progress
          });
        }
        
        if (jobData.status === 'completed' || jobData.status === 'failed') {
          if (fallbackPollingRef.current) {
            clearInterval(fallbackPollingRef.current);
            fallbackPollingRef.current = null;
          }
        }
      }
    }, 2000); // Poll every 2 seconds
    
    // Stop polling after 60 seconds to avoid long-running timers
    setTimeout(() => {
      if (fallbackPollingRef.current) {
        console.log('⏰ Stopping fallback polling after 60s');
        clearInterval(fallbackPollingRef.current);
        fallbackPollingRef.current = null;
      }
    }, 60000);
  }, [updateStage]);

  // Cleanup subscription and timers
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        console.log('🔌 Cleaning up realtime subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      if (fallbackPollingRef.current) {
        clearInterval(fallbackPollingRef.current);
        fallbackPollingRef.current = null;
      }
    };
  }, []);

  // Reset state and cleanup
  const reset = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    
    if (fallbackPollingRef.current) {
      clearInterval(fallbackPollingRef.current);
      fallbackPollingRef.current = null;
    }
    
    setState({
      jobId: null,
      overallProgress: 0,
      currentStage: null,
      stages: [],
      partialResults: {},
      isComplete: false,
      error: null,
      totalProcessingTime: 0,
      estimatedTimeRemaining: 0
    });
    
    setConnectionStatus('connecting');
    setLastEventReceived(null);
    startTimeRef.current = 0;
  }, []);

  return {
    ...state,
    createStreamingJob,
    reset,
    connectionStatus,
    lastEventReceived,
    isProcessing: !state.isComplete && !state.error && state.jobId !== null
  };
};