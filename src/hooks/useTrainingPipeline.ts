import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TrainingJob {
  id: string;
  farm_id?: string;
  model_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  config: Record<string, any>;
  dataset_size: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metrics?: Record<string, any>;
}

export interface TrainingConfig {
  learning_rate?: number;
  batch_size?: number;
  epochs?: number;
  validation_split?: number;
  model_type?: string;
}

export const useTrainingJobs = (farmId?: string) => {
  return useQuery({
    queryKey: ['training-jobs', farmId],
    queryFn: async (): Promise<TrainingJob[]> => {
      const { data, error } = await supabase.functions.invoke('training-pipeline', {
        body: {
          action: 'get_training_status',
          farm_id: farmId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to fetch training jobs');

      return data.training_jobs || [];
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });
};

export const useExtractTrainingData = () => {
  return useMutation({
    mutationFn: async ({ farmId, sinceDate, maxRecords }: {
      farmId?: string;
      sinceDate?: string;
      maxRecords?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('training-pipeline', {
        body: {
          action: 'extract_training_data',
          farm_id: farmId,
          since_date: sinceDate,
          max_records: maxRecords
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to extract training data');

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Training data extracted',
        description: `Extracted ${data.dataset.length} training samples with ${data.quality_issues.length} quality issues.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Extraction failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const usePreprocessData = () => {
  return useMutation({
    mutationFn: async ({ dataset, targetFormat }: {
      dataset: any[];
      targetFormat?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('training-pipeline', {
        body: {
          action: 'preprocess_data',
          dataset,
          target_format: targetFormat
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to preprocess data');

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Data preprocessed',
        description: `Preprocessed ${data.preprocessed_data.length} samples for training.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Preprocessing failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useTriggerTraining = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      trainingData, 
      trainingConfig, 
      farmId 
    }: {
      trainingData: any[];
      trainingConfig?: TrainingConfig;
      farmId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('training-pipeline', {
        body: {
          action: 'trigger_training',
          training_data: trainingData,
          training_config: trainingConfig,
          farm_id: farmId
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to trigger training');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-jobs'] });
      toast({
        title: 'Training started',
        description: `Training job ${data.training_job_id} has been queued.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Training failed to start',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeployModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      trainingJobId, 
      environment 
    }: {
      trainingJobId: string;
      environment?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('training-pipeline', {
        body: {
          action: 'deploy_model',
          training_job_id: trainingJobId,
          deployment_environment: environment
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to deploy model');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['training-jobs'] });
      toast({
        title: 'Model deployment started',
        description: `Model version ${data.version} is being deployed.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Deployment failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};