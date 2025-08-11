import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PipelineRun {
  id: string;
  status: string;
  stage: string;
  progress: number;
  created_at: string;
  updated_at: string;
  stats: any;
}

export const useActiveRun = () => {
  const [activeRun, setActiveRun] = useState<PipelineRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial active run
  const fetchActiveRun = async () => {
    try {
      const { data, error } = await supabase
        .from('v_active_run_status')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      // Map the view data to our interface (v_active_run_status columns)
      const mappedData = data ? {
        id: data.id, // View returns 'id', not 'run_id'
        status: data.status,
        stage: data.stage,
        progress: data.progress,
        created_at: data.started_at, // Use started_at as created_at fallback
        updated_at: new Date().toISOString(), // Current time as fallback
        stats: data.config || {} // Use config as stats fallback
      } : null;
      
      setActiveRun(mappedData);
      
      // Store in session storage as fallback
      if (mappedData) {
        sessionStorage.setItem('activePipelineRun', JSON.stringify(mappedData));
      }
    } catch (error) {
      console.error('Error fetching active run:', error);
      // Try to load from session storage
      const stored = sessionStorage.getItem('activePipelineRun');
      if (stored) {
        try {
          setActiveRun(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing stored run:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRun();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    if (!activeRun?.id) return;

    const channel = supabase
      .channel('pipeline-run-updates')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'pipeline_runs', 
          filter: `id=eq.${activeRun.id}` 
        },
        (payload) => {
          const updated = payload.new as any;
          const mappedUpdate = {
            id: updated.id,
            status: updated.status,
            stage: updated.stage,
            progress: updated.progress,
            created_at: updated.created_at,
            updated_at: updated.updated_at,
            stats: updated.stats
          };
          setActiveRun(mappedUpdate);
          sessionStorage.setItem('activePipelineRun', JSON.stringify(mappedUpdate));
        }
      )
      .subscribe();

    // Polling fallback every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('pipeline_runs')
          .select('*')
          .eq('id', activeRun.id)
          .single();

        if (data) {
          const mappedData = {
            id: data.id,
            status: data.status,
            stage: data.stage,
            progress: data.progress,
            created_at: data.created_at,
            updated_at: data.updated_at,
            stats: data.stats
          };
          
          if (JSON.stringify(mappedData) !== JSON.stringify(activeRun)) {
            setActiveRun(mappedData);
            sessionStorage.setItem('activePipelineRun', JSON.stringify(mappedData));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [activeRun?.id]);

  // Check if we can start a new run
  const canStart = !activeRun || ['completed', 'failed', 'canceled'].includes(activeRun.status);

  // Start new pipeline run
  const startRun = async (config?: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('pipeline-runs', {
        body: { action: 'start', config }
      });

      if (error) throw error;

      if (data.success) {
        setActiveRun(data.run);
        toast({
          title: "Pipeline Started",
          description: "The pipeline has been started successfully.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error starting pipeline:', error);
      toast({
        title: "Failed to Start Pipeline",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Cancel active run
  const cancelRun = async () => {
    if (!activeRun) return;

    try {
      const { data, error } = await supabase.functions.invoke('pipeline-runs', {
        body: { action: 'cancel', runId: activeRun.id }
      });

      if (error) throw error;

      if (data.success) {
        setActiveRun(data.run);
        toast({
          title: "Pipeline Canceled",
          description: "The pipeline has been canceled.",
        });
      }
    } catch (error) {
      console.error('Error canceling pipeline:', error);
      toast({
        title: "Failed to Cancel Pipeline",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return {
    activeRun,
    isLoading,
    canStart,
    startRun,
    cancelRun,
    refetch: fetchActiveRun
  };
};