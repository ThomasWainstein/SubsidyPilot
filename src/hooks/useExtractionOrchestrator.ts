import { useState, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExtractionState {
  documentId: string;
  status: 'idle' | 'uploading' | 'extracting' | 'reviewing' | 'completed' | 'failed';
  progress: number;
  extractedData: any;
  errors: string[];
  source: 'rule-based' | 'ai-based' | 'merged' | 'error';
  confidence: number;
}

interface ExtractionOrchestratorOptions {
  onStateChange?: (state: ExtractionState) => void;
  onComplete?: (extractedData: any) => void;
  onError?: (error: Error) => void;
}

export const useExtractionOrchestrator = (options: ExtractionOrchestratorOptions = {}) => {
  const [states, setStates] = useState<Map<string, ExtractionState>>(new Map());
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Centralized state update function with validation
  const updateDocumentState = useCallback((documentId: string, updates: Partial<ExtractionState>) => {
    setStates(prev => {
      const current = prev.get(documentId) || {
        documentId,
        status: 'idle',
        progress: 0,
        extractedData: null,
        errors: [],
        source: 'error' as const,
        confidence: 0
      };
      
      const newState = { ...current, ...updates };
      
      // Validate state transitions
      if (current.status === 'completed' && newState.status !== 'completed' && newState.status !== 'reviewing') {
        console.warn(`Invalid state transition from ${current.status} to ${newState.status}`);
        return prev;
      }
      
      const newStates = new Map(prev);
      newStates.set(documentId, newState);
      
      // Notify listeners
      options.onStateChange?.(newState);
      
      return newStates;
    });
  }, [options]);

  // Start document processing pipeline
  const processDocument = useCallback(async (documentId: string, documentUrl: string, forceAI = false) => {
    try {
      setIsProcessing(true);
      setGlobalError(null);
      
      // Create abort controller for this operation
      abortControllerRef.current = new AbortController();
      
      updateDocumentState(documentId, {
        status: 'extracting',
        progress: 10,
        errors: []
      });

      console.log('🔄 Starting extraction orchestration:', { documentId, forceAI });

      // Call hybrid extraction with abort signal
      const { data, error } = await supabase.functions.invoke('hybrid-extraction', {
        body: {
          documentUrl,
          documentId,
          forceAI
        }
      });

      // Check if operation was aborted
      if (abortControllerRef.current?.signal.aborted) {
        updateDocumentState(documentId, {
          status: 'failed',
          errors: ['Operation was cancelled']
        });
        return;
      }

      if (error) {
        const errorMessage = `Extraction failed: ${error.message}`;
        updateDocumentState(documentId, {
          status: 'failed',
          progress: 0,
          errors: [errorMessage]
        });
        
        toast({
          title: 'Extraction Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        
        options.onError?.(new Error(errorMessage));
        return;
      }

      if (!data) {
        const errorMessage = 'No data returned from extraction';
        updateDocumentState(documentId, {
          status: 'failed',
          errors: [errorMessage]
        });
        
        toast({
          title: 'Extraction Failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      // Process successful extraction
      updateDocumentState(documentId, {
        status: 'completed',
        progress: 100,
        extractedData: data.extractedFields,
        source: data.source,
        confidence: data.confidence,
        errors: []
      });

      // Show appropriate success message
      const successMessage = data.source === 'merged' 
        ? 'Hybrid extraction completed successfully'
        : data.source === 'ai-based'
        ? 'AI extraction completed successfully'
        : 'Rule-based extraction completed successfully';

      toast({
        title: 'Extraction Complete',
        description: successMessage,
      });

      options.onComplete?.(data.extractedFields);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
      
      updateDocumentState(documentId, {
        status: 'failed',
        progress: 0,
        errors: [errorMessage]
      });
      
      setGlobalError(errorMessage);
      
      toast({
        title: 'Extraction Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [updateDocumentState, options]);

  // Cancel ongoing operations
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast({
        title: 'Processing Cancelled',
        description: 'Document processing has been cancelled.',
      });
    }
  }, []);

  // Retry failed extraction
  const retryExtraction = useCallback(async (documentId: string, documentUrl: string, forceAI = true) => {
    const currentState = states.get(documentId);
    if (currentState?.status === 'extracting') {
      console.warn('Cannot retry - extraction already in progress');
      return;
    }
    
    console.log('🔄 Retrying extraction with AI fallback:', { documentId });
    await processDocument(documentId, documentUrl, forceAI);
  }, [states, processDocument]);

  // Get extraction state for a document
  const getDocumentState = useCallback((documentId: string): ExtractionState | null => {
    return states.get(documentId) || null;
  }, [states]);

  // Clear state for a document
  const clearDocumentState = useCallback((documentId: string) => {
    setStates(prev => {
      const newStates = new Map(prev);
      newStates.delete(documentId);
      return newStates;
    });
  }, []);

  // Get aggregated statistics
  const getStatistics = useCallback(() => {
    const stateArray = Array.from(states.values());
    return {
      total: stateArray.length,
      completed: stateArray.filter(s => s.status === 'completed').length,
      failed: stateArray.filter(s => s.status === 'failed').length,
      processing: stateArray.filter(s => s.status === 'extracting').length,
      averageConfidence: stateArray.length > 0 
        ? stateArray.reduce((sum, s) => sum + s.confidence, 0) / stateArray.length 
        : 0
    };
  }, [states]);

  return {
    // Core operations
    processDocument,
    retryExtraction,
    cancelProcessing,
    
    // State management
    getDocumentState,
    clearDocumentState,
    updateDocumentState,
    
    // Status
    isProcessing,
    globalError,
    states: Array.from(states.values()),
    
    // Analytics
    getStatistics,
    
    // Computed properties
    hasErrors: globalError !== null || Array.from(states.values()).some(s => s.errors.length > 0),
    hasCompletedExtractions: Array.from(states.values()).some(s => s.status === 'completed'),
    processingCount: Array.from(states.values()).filter(s => s.status === 'extracting').length
  };
};

export default useExtractionOrchestrator;