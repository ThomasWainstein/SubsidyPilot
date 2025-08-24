/**
 * Enhanced Real-Time Processing Hook
 * Combines both Claude and Copilot approaches for maximum reliability
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type JobRow = {
  id: string;
  document_id: string;
  status: string;
  stages_completed?: number;
  stages_total?: number;
  metadata?: any;
  updated_at?: string;
  created_at?: string;
  priority?: string;
  processing_time_ms?: number;
  error_message?: string;
};

interface ProcessingStage {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  results?: any;
  error?: string;
}

export function useRealTimeProcessingEnhanced({ documentId }: { documentId: string | null }) {
  const [job, setJob] = useState<JobRow | null>(null);
  const [stages, setStages] = useState<ProcessingStage[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  // Initialize default stages
  const initializeStages = useCallback(() => {
    const defaultStages: ProcessingStage[] = [
      { id: 'upload', name: 'File Upload', status: 'completed', progress: 100 },
      { id: 'text-extraction', name: 'Text Extraction', status: 'pending', progress: 0 },
      { id: 'pattern-analysis', name: 'Pattern Analysis', status: 'pending', progress: 0 },
      { id: 'ai-processing', name: 'AI Processing', status: 'pending', progress: 0 },
      { id: 'data-merging', name: 'Data Merging', status: 'pending', progress: 0 },
      { id: 'validation', name: 'Validation', status: 'pending', progress: 0 }
    ];
    setStages(defaultStages);
    return defaultStages;
  }, []);

  // Update stage progress
  const updateStage = useCallback((stageId: string, updates: Partial<ProcessingStage>) => {
    setStages(prev => prev.map(stage => 
      stage.id === stageId 
        ? { 
            ...stage, 
            ...updates,
            endTime: updates.status === 'completed' ? new Date() : stage.endTime,
            startTime: updates.status === 'processing' && !stage.startTime ? new Date() : stage.startTime
          }
        : stage
    ));
  }, []);

  // Calculate overall progress
  const overallProgress = stages.length > 0 
    ? Math.round(stages.reduce((sum, stage) => sum + stage.progress, 0) / stages.length)
    : 0;

  // Get current stage
  const currentStage = stages.find(s => s.status === 'processing')?.name || null;
  const isComplete = stages.length > 0 && stages.every(s => s.status === 'completed' || s.status === 'failed');

  useEffect(() => {
    if (!documentId) return;
    let isMounted = true;

    // Initialize stages
    initializeStages();

    async function fetchInitialJob() {
      console.log(`[realtime-enhanced] Fetching initial job for document ${documentId}`);
      const { data, error } = await supabase
        .from('document_processing_jobs')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[realtime-enhanced] Initial fetch error:', error);
        return;
      }
      
      if (isMounted && data) {
        setJob(data);
        
        // Update stages based on job status
        if (data.status === 'completed') {
          // Mark all stages as completed
          setStages(prev => prev.map(stage => ({
            ...stage,
            status: 'completed' as const,
            progress: 100,
            endTime: stage.endTime || new Date()
          })));
        } else if (data.metadata && typeof data.metadata === 'object' && 'stage' in data.metadata) {
          const metadata = data.metadata as any;
          updateStage(metadata.stage, {
            status: data.status === 'processing' ? 'processing' : 'completed',
            progress: metadata.progress || 50
          });
        }
      }
    }

    fetchInitialJob();

    // Set up comprehensive subscription
    const filter = `document_id=eq.${documentId}`;
    console.log(`[realtime-enhanced] Setting up subscription with filter: ${filter}`);

    const channel = supabase
      .channel(`enhanced-job-updates-${documentId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'document_processing_jobs', 
          filter 
        },
        (payload: RealtimePostgresChangesPayload<JobRow>) => {
          console.log('[realtime-enhanced] Job UPDATE payload:', payload);
          setLastEventAt(Date.now());
          const newRow = payload.new as JobRow;
          
          setJob(prev => ({ ...(prev || {}), ...newRow }));
          
          // Update stages based on job status
          if (newRow.status === 'processing' && newRow.metadata && typeof newRow.metadata === 'object' && 'stage' in newRow.metadata) {
            const metadata = newRow.metadata as any;
            updateStage(metadata.stage, {
              status: 'processing',
              progress: metadata.progress || 50
            });
          } else if (newRow.status === 'completed') {
            // Mark all stages as completed
            stages.forEach(stage => {
              if (stage.status !== 'completed') {
                updateStage(stage.id, { status: 'completed', progress: 100 });
              }
            });
          } else if (newRow.status === 'failed') {
            // Mark current processing stage as failed
            const processingStage = stages.find(s => s.status === 'processing');
            if (processingStage) {
              updateStage(processingStage.id, { 
                status: 'failed', 
                error: newRow.error_message,
                progress: 0 
              });
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'document_processing_jobs', 
          filter 
        },
        (payload: RealtimePostgresChangesPayload<JobRow>) => {
          console.log('[realtime-enhanced] Job INSERT payload:', payload);
          setLastEventAt(Date.now());
          setJob(payload.new as JobRow);
        },
      )
      .subscribe(status => {
        console.log('[realtime-enhanced] Subscription status:', status);
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Fallback polling mechanism
    fallbackTimerRef.current = setTimeout(() => {
      if (lastEventAt === null) {
        console.log('[realtime-enhanced] No events received, starting fallback polling');
        pollingRef.current = setInterval(async () => {
          console.log('[realtime-enhanced] Fallback poll for document:', documentId);
          const { data, error } = await supabase
            .from('document_processing_jobs')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error('[realtime-enhanced] Fallback poll error:', error);
            return;
          }
          
          if (data) {
            setJob(data);
            setLastEventAt(Date.now());
            
            // Update stages based on polled data
            if (data.status === 'completed') {
              // Mark all stages as completed
              setStages(prev => prev.map(stage => ({
                ...stage,
                status: 'completed' as const,
                progress: 100,
                endTime: stage.endTime || new Date()
              })));
            } else if (data.metadata && typeof data.metadata === 'object' && 'stage' in data.metadata) {
              const metadata = data.metadata as any;
              updateStage(metadata.stage, {
                status: data.status === 'processing' ? 'processing' : 'completed',
                progress: metadata.progress || 50
              });
            }
          }
        }, 2000); // Poll every 2 seconds
      }
    }, 5000); // Wait 5 seconds before starting fallback

    // Stop fallback polling after 60 seconds
    const stopFallbackTimeout = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        console.log('[realtime-enhanced] Stopped fallback polling after 60s');
      }
    }, 60000);

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      clearTimeout(stopFallbackTimeout);
    };
  }, [documentId, initializeStages, updateStage]);

  return { 
    job, 
    stages,
    overallProgress, 
    currentStage,
    isComplete,
    connected, 
    lastEventAt,
    // Helper functions for UI
    getCompletedStagesCount: () => stages.filter(s => s.status === 'completed').length,
    getTotalStagesCount: () => stages.length,
    hasError: () => stages.some(s => s.status === 'failed')
  };
}