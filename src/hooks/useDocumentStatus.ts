import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ExtractionStatus = 
  | 'uploading'
  | 'virus_scan' 
  | 'extracting'
  | 'ocr'
  | 'ai'
  | 'completed'
  | 'failed';

export interface DocumentStatusData {
  documentId: string;
  document: {
    filename: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  };
  extraction: {
    id: string;
    status: ExtractionStatus;
    step: string;
    progress: number;
    progressDetails: {
      step: string;
      pagesProcessed?: number;
      totalPages?: number;
      currentOperation?: string;
    };
    confidence?: number;
    lastEventAt: string;
    failureCode?: string;
    failureDetail?: string;
    currentRetry: number;
    maxRetries: number;
    nextRetryAt?: string;
    tableCount: number;
    processingTimeMs?: number;
  } | null;
  retryable: boolean;
  metrics: {
    totalOperations: number;
    avgDuration: number;
    successRate: number;
    operationBreakdown: Record<string, number>;
  };
  lastUpdated: string;
}

export interface UseDocumentStatusOptions {
  enableRealtime?: boolean;
  pollingInterval?: number;
  maxBackoffDelay?: number;
}

export function useDocumentStatus(
  documentId: string | null, 
  options: UseDocumentStatusOptions = {}
) {
  const { 
    enableRealtime = true, 
    pollingInterval = 2000,
    maxBackoffDelay = 30000 
  } = options;

  const [currentBackoff, setCurrentBackoff] = useState(pollingInterval);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch status from API
  const { 
    data: status, 
    error, 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['document-status', documentId],
    queryFn: async (): Promise<DocumentStatusData> => {
      if (!documentId) throw new Error('Document ID required');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(
        `https://gvfgvbztagafjykncwto.supabase.co/functions/v1/document-status-api/documents/${documentId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    enabled: !!documentId,
    refetchInterval: (data) => {
      // Stop polling if completed, failed, or realtime is connected
      if (!data?.extraction || 
          data.extraction.status === 'completed' || 
          data.extraction.status === 'failed' ||
          realtimeConnected) {
        return false;
      }
      
      // Exponential backoff for active processing
      const nextBackoff = Math.min(currentBackoff * 1.5, maxBackoffDelay);
      setCurrentBackoff(nextBackoff);
      return currentBackoff;
    },
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Setup realtime subscription
  useEffect(() => {
    if (!documentId || !enableRealtime) return;

    console.log(`🔄 Setting up realtime subscription for document: ${documentId}`);

    const channel = supabase
      .channel(`doc:${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_extractions',
          filter: `document_id=eq.${documentId}`
        },
        (payload) => {
          console.log('📡 Realtime update received:', payload);
          
          // Invalidate and refetch status
          queryClient.invalidateQueries({ queryKey: ['document-status', documentId] });
          
          // Show toast for status changes
          if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new?.status_v2;
            const oldStatus = payload.old?.status_v2;
            
            if (newStatus !== oldStatus) {
              showStatusChangeToast(newStatus, payload.new?.failure_code);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        setRealtimeConnected(status === 'SUBSCRIBED');
        
        if (status === 'SUBSCRIBED') {
          setCurrentBackoff(pollingInterval); // Reset backoff when realtime connects
        }
      });

    return () => {
      console.log(`🔄 Cleaning up realtime subscription for document: ${documentId}`);
      supabase.removeChannel(channel);
      setRealtimeConnected(false);
    };
  }, [documentId, enableRealtime, queryClient, pollingInterval]);

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (): Promise<any> => {
      if (!documentId) throw new Error('Document ID required');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const response = await fetch(
        `https://gvfgvbztagafjykncwto.supabase.co/functions/v1/document-status-api/documents/${documentId}/retry`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Retry Scheduled",
        description: `Document processing will retry in ${Math.round(data.delaySeconds / 60)} minutes.`,
      });
      
      // Immediately refetch status
      queryClient.invalidateQueries({ queryKey: ['document-status', documentId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const showStatusChangeToast = useCallback((status: ExtractionStatus, failureCode?: string) => {
    const statusMessages = {
      'virus_scan': { title: "Security Scan", description: "Checking file for threats..." },
      'extracting': { title: "Extracting Content", description: "Reading document text and tables..." },
      'ocr': { title: "OCR Processing", description: "Converting scanned content to text..." },
      'ai': { title: "AI Analysis", description: "Extracting farm data with AI..." },
      'completed': { title: "Processing Complete", description: "Document successfully processed!", variant: "default" as const },
      'failed': { 
        title: "Processing Failed", 
        description: getFailureMessage(failureCode),
        variant: "destructive" as const 
      }
    };

    const message = statusMessages[status];
    if (message) {
      toast(message);
    }
  }, [toast]);

  const getFailureMessage = (failureCode?: string): string => {
    const messages = {
      'virus_detected': 'File contains malicious content',
      'file_too_large': 'File exceeds size limits',
      'unsupported_format': 'File format not supported',
      'extraction_timeout': 'Processing timed out',
      'ai_quota_exceeded': 'AI service quota exceeded',
      'network_error': 'Network connection failed'
    };
    return messages[failureCode as keyof typeof messages] || 'Unknown error occurred';
  };

  return {
    status,
    isLoading,
    error,
    refetch,
    retry: retryMutation.mutate,
    isRetrying: retryMutation.isPending,
    retryError: retryMutation.error,
    realtimeConnected,
    // Computed values
    isProcessing: status?.extraction?.status && 
      !['completed', 'failed'].includes(status.extraction.status),
    isRetryable: status?.retryable || false,
    progressPercentage: status?.extraction?.progress || 0,
    currentStep: status?.extraction?.step || 'Pending',
    hasError: status?.extraction?.status === 'failed',
    errorCode: status?.extraction?.failureCode,
    errorMessage: status?.extraction?.failureDetail,
    retryCount: status?.extraction?.currentRetry || 0,
    maxRetries: status?.extraction?.maxRetries || 3,
    nextRetryAt: status?.extraction?.nextRetryAt,
    tableCount: status?.extraction?.tableCount || 0,
    lastUpdated: status?.lastUpdated,
    metrics: status?.metrics
  };
}