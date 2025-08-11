import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PipelineRun {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  stage: 'init' | 'harvest' | 'ai' | 'forms' | 'done';
  progress: number;
  started_at: string;
  ended_at?: string;
  error?: any;
  stats: any;
  config: any;
  created_at: string;
  updated_at: string;
}

export function usePipelineRun() {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  // Rehydrate from backend on mount
  const rehydrate = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('pipeline-runs', {
        body: { action: 'get_active' }
      });

      if (error) throw error;

      const activeRun = data.run;
      runIdRef.current = activeRun?.id || null;
      setRun(activeRun);
      setError(null);

      // Store in sessionStorage for persistence across refreshes
      if (activeRun) {
        sessionStorage.setItem('active_pipeline_run', JSON.stringify(activeRun));
      } else {
        sessionStorage.removeItem('active_pipeline_run');
      }
    } catch (err: any) {
      console.error('Failed to rehydrate pipeline run:', err);
      setError(err.message);
      
      // Try to restore from sessionStorage
      const stored = sessionStorage.getItem('active_pipeline_run');
      if (stored) {
        try {
          const storedRun = JSON.parse(stored);
          if (storedRun.status === 'running' || storedRun.status === 'queued') {
            setRun(storedRun);
            runIdRef.current = storedRun.id;
          }
        } catch {
          sessionStorage.removeItem('active_pipeline_run');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Start a new pipeline run
  const start = useCallback(async (config?: any) => {
    try {
      setError(null);
      
      // Optimistically set to starting state
      const optimisticRun: PipelineRun = {
        id: 'starting',
        status: 'queued',
        stage: 'init',
        progress: 0,
        started_at: new Date().toISOString(),
        stats: {},
        config: config || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setRun(optimisticRun);

      const { data, error } = await supabase.functions.invoke('pipeline-runs', {
        body: {
          action: 'start',
          config: config || {}
        }
      });

      if (error) throw error;

      runIdRef.current = data.runId;
      setRun(data.run);
      
      // Store in sessionStorage
      sessionStorage.setItem('active_pipeline_run', JSON.stringify(data.run));
      
      return data.run;
    } catch (err: any) {
      console.error('Failed to start pipeline run:', err);
      setError(err.message);
      setRun(null);
      throw err;
    }
  }, []);

  // Cancel the current run
  const cancel = useCallback(async () => {
    if (!runIdRef.current) return;

    try {
      const { data, error } = await supabase.functions.invoke('pipeline-runs', {
        body: {
          action: 'cancel',
          runId: runIdRef.current
        }
      });

      if (error) throw error;
      
      setRun(data.run);
      sessionStorage.setItem('active_pipeline_run', JSON.stringify(data.run));
    } catch (err: any) {
      console.error('Failed to cancel pipeline run:', err);
      setError(err.message);
    }
  }, []);

  // Set up realtime subscription and polling
  useEffect(() => {
    let abortController = new AbortController();
    let pollInterval: NodeJS.Timeout;

    // Initial rehydration
    rehydrate();

    // Set up realtime subscription for pipeline_runs updates
    if (runIdRef.current) {
      subscriptionRef.current = supabase
        .channel('pipeline-runs-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pipeline_runs',
            filter: `id=eq.${runIdRef.current}`
          },
          (payload) => {
            console.log('Pipeline run updated via realtime:', payload);
            if (payload.new && (payload.new as any).id === runIdRef.current) {
              const updatedRun = payload.new as PipelineRun;
              setRun(updatedRun);
              sessionStorage.setItem('active_pipeline_run', JSON.stringify(updatedRun));
            }
          }
        )
        .subscribe();
    }

    // Fallback polling every 5 seconds if we have an active run
    const startPolling = () => {
      if (!runIdRef.current) return;

      pollInterval = setInterval(async () => {
        if (abortController.signal.aborted) return;

        try {
          const { data, error } = await supabase.functions.invoke('pipeline-runs', {
            body: {
              action: 'get_status',
              runId: runIdRef.current
            }
          });

          if (error || abortController.signal.aborted) return;

          // Only update if this is still the current run
          if (data.run?.id === runIdRef.current) {
            setRun(data.run);
            sessionStorage.setItem('active_pipeline_run', JSON.stringify(data.run));

            // Stop polling if run is finished
            if (['completed', 'failed', 'canceled'].includes(data.run.status)) {
              clearInterval(pollInterval);
              runIdRef.current = null;
              sessionStorage.removeItem('active_pipeline_run');
            }
          }
        } catch (err) {
          console.warn('Polling failed:', err);
        }
      }, 5000);
    };

    // Start polling if we have an active run
    if (runIdRef.current && run?.status && ['queued', 'running'].includes(run.status)) {
      startPolling();
    }

    return () => {
      abortController.abort();
      clearInterval(pollInterval);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rehydrate, run?.status]);

  // Update runIdRef when run changes
  useEffect(() => {
    if (run?.id && run.id !== 'starting') {
      runIdRef.current = run.id;
    } else if (!run) {
      runIdRef.current = null;
    }
  }, [run?.id]);

  return {
    run,
    loading,
    error,
    start,
    cancel,
    rehydrate,
    isActive: run && ['queued', 'running'].includes(run.status),
    isStarting: run?.id === 'starting'
  };
}