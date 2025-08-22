import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessingStage {
  id: string;
  name: string;  
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  results?: any;
  error?: string;
}

export interface ProcessingState {
  documentId: string;
  overallProgress: number;
  currentStage: string;
  stages: ProcessingStage[];
  isComplete: boolean;
  hasError: boolean;
  totalTime?: number;
  extractedData?: any;
  confidenceScore?: number;
  processingMethod?: string;
}

export function useRealTimeProcessing(documentId?: string) {
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    // Initialize processing state
    const initialStages: ProcessingStage[] = [
      { id: 'upload_processing', name: 'Upload Processing', progress: 0, status: 'pending' },
      { id: 'text_extraction', name: 'Text Extraction', progress: 0, status: 'pending' },
      { id: 'pattern_analysis', name: 'Pattern Analysis', progress: 0, status: 'pending' },
      { id: 'database_enrichment', name: 'Database Enrichment', progress: 0, status: 'pending' },
      { id: 'ai_processing', name: 'AI Processing', progress: 0, status: 'pending' },
      { id: 'data_merging', name: 'Data Merging & Validation', progress: 0, status: 'pending' }
    ];

    setProcessingState({
      documentId,
      overallProgress: 0,
      currentStage: 'upload_processing',
      stages: initialStages,
      isComplete: false,
      hasError: false
    });

    // Subscribe to real-time updates for document extractions
    const channel = supabase
      .channel('document-processing')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'document_extractions',
          filter: `document_id=eq.${documentId}`
        },
        (payload) => {
          console.log('📡 Real-time processing update:', payload);
          
          const newData = payload.new as any;
          const progressMetadata = newData.progress_metadata || {};
          
          setProcessingState(prev => {
            if (!prev) return prev;

            const updatedStages = prev.stages.map(stage => {
              if (stage.id === progressMetadata.stage) {
                return {
                  ...stage,
                  progress: progressMetadata.progress || stage.progress,
                  status: 'processing' as const,
                  startTime: stage.startTime || new Date()
                };
              }
              
              // Mark previous stages as completed
              const stageIndex = prev.stages.findIndex(s => s.id === stage.id);
              const currentStageIndex = prev.stages.findIndex(s => s.id === progressMetadata.stage);
              
              if (stageIndex < currentStageIndex && stage.status !== 'completed') {
                return {
                  ...stage,
                  status: 'completed' as const,
                  progress: 100,
                  endTime: new Date()
                };
              }
              
              return stage;
            });

            // Handle completion
            if (newData.status_v2 === 'completed') {
              const finalStages = updatedStages.map(stage => ({
                ...stage,
                status: 'completed' as const,
                progress: 100,
                endTime: stage.endTime || new Date()
              }));

              return {
                ...prev,
                stages: finalStages,
                overallProgress: 100,
                isComplete: true,
                extractedData: newData.extracted_data,
                confidenceScore: newData.confidence_score,
                processingMethod: progressMetadata.extraction_method,
                totalTime: progressMetadata.processing_time_ms
              };
            }

            // Handle failure
            if (newData.status_v2 === 'failed') {
              const currentStageIndex = prev.stages.findIndex(s => s.id === progressMetadata.stage);
              const failedStages = updatedStages.map((stage, index) => {
                if (index === currentStageIndex) {
                  return {
                    ...stage,
                    status: 'error' as const,
                    error: newData.failure_detail
                  };
                }
                return stage;
              });

              return {
                ...prev,
                stages: failedStages,
                hasError: true,
                currentStage: progressMetadata.stage
              };
            }

            return {
              ...prev,
              stages: updatedStages,
              currentStage: progressMetadata.stage,
              overallProgress: progressMetadata.progress || prev.overallProgress
            };
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [documentId]);

  // Get current stage info
  const getCurrentStage = () => {
    if (!processingState) return null;
    return processingState.stages.find(s => s.id === processingState.currentStage);
  };

  // Get completed stages count
  const getCompletedStagesCount = () => {
    if (!processingState) return 0;
    return processingState.stages.filter(s => s.status === 'completed').length;
  };

  // Get processing summary
  const getProcessingSummary = () => {
    if (!processingState) return null;
    
    const completed = getCompletedStagesCount();
    const total = processingState.stages.length;
    const current = getCurrentStage();
    
    return {
      completed,
      total,
      currentStage: current,
      isProcessing: !processingState.isComplete && !processingState.hasError,
      timeElapsed: processingState.totalTime,
      method: processingState.processingMethod
    };
  };

  return {
    processingState,
    isConnected,
    getCurrentStage,
    getCompletedStagesCount,
    getProcessingSummary
  };
}