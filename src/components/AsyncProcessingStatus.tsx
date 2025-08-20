import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface AsyncProcessingStatusProps {
  documentId: string;
  onComplete?: (extractionData: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const AsyncProcessingStatus = ({ 
  documentId, 
  onComplete, 
  onError,
  className = ""
}: AsyncProcessingStatusProps) => {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchJobStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_processing_job_status', {
        p_document_id: documentId
      });

      if (error) {
        console.error('Failed to fetch job status:', error);
        return;
      }

      if (data && data.length > 0) {
        const jobData = data[0] as ProcessingJob;
        setJob(jobData);
        setLastUpdate(new Date().toLocaleTimeString());

        // Handle completion
        if (jobData.status === 'completed' && onComplete) {
          const { data: extractionData } = await supabase
            .from('document_extractions')
            .select('*')
            .eq('document_id', documentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          onComplete(extractionData);
        }

        // Handle errors
        if (jobData.status === 'failed' && onError) {
          onError(jobData.error_message || 'Processing failed');
        }
      }
    } catch (err) {
      console.error('Error fetching job status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchJobStatus();

    // Set up polling for active jobs
    const pollInterval = setInterval(() => {
      if (job?.status && ['queued', 'processing', 'retry_scheduled'].includes(job.status)) {
        fetchJobStatus();
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [documentId, job?.status]);

  // Real-time updates
  useEffect(() => {
    if (!job?.job_id) return;

    const channel = supabase
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
          console.log('🔄 Real-time job update received');
          fetchJobStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [job?.job_id]);

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading processing status...</span>
        </div>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No processing job found for this document</span>
        </div>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 animate-spin text-primary" />;
      case 'queued':
        return <Clock className="w-5 h-5 text-muted-foreground" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed': return 'success';
      case 'failed': return 'destructive';
      case 'processing': return 'default';
      case 'queued': return 'secondary';
      case 'retry_scheduled': return 'warning';
      default: return 'secondary';
    }
  };

  const formatTime = (ms?: number) => {
    if (!ms) return 'Unknown';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.round(ms/1000)}s`;
    return `${Math.round(ms/60000)}m`;
  };

  const formatEstimatedCompletion = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Any moment now';
    
    const diffMinutes = Math.round(diffMs / 60000);
    if (diffMinutes < 1) return 'Less than 1 minute';
    if (diffMinutes === 1) return '1 minute';
    return `${diffMinutes} minutes`;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Status header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold">Document Processing</h3>
              <div className="flex items-center space-x-2">
                <Badge variant={getStatusColor() as any}>
                  {job.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {job.priority.toUpperCase()} PRIORITY
                </Badge>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchJobStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Progress bar */}
        {job.status !== 'failed' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{job.progress_percentage}%</span>
            </div>
            <Progress value={job.progress_percentage} className="w-full" />
          </div>
        )}

        {/* Processing details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground">Processing Time:</span>
            <br />
            <span>{formatTime(job.processing_time_ms)}</span>
          </div>
          <div>
            <span className="font-medium text-muted-foreground">Estimated Completion:</span>
            <br />
            <span>
              {job.status === 'completed' ? 'Completed' : 
               job.status === 'failed' ? 'Failed' :
               formatEstimatedCompletion(job.estimated_completion)}
            </span>
          </div>
        </div>

        {/* Error message */}
        {job.error_message && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-start space-x-2">
              <XCircle className="w-4 h-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Processing Error</p>
                <p className="text-sm text-destructive/80 mt-1">{job.error_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last update info */}
        {lastUpdate && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            Last updated: {lastUpdate} • Job ID: {job.job_id.slice(0, 8)}
          </div>
        )}

        {/* Phase 2 indicator */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-accent/50 p-2 rounded">
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          <span>Async Processing (Phase 2) - Handles large EU policy documents reliably</span>
        </div>
      </div>
    </Card>
  );
};