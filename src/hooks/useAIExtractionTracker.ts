/**
 * AI Extraction Tracker Hook
 * Tracks AI extraction status and provides debugging capabilities
 * Addresses critical issue where AI appears non-functional despite token usage
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface ExtractionAttempt {
  id: string;
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence: number;
  tokensUsed?: number;
  processingTime?: number;
  extractedFieldsCount: number;
  savedFieldsCount: number;
  model: string;
  errorMessage?: string;
  createdAt: string;
  extractedData?: Record<string, any>;
  mappedData?: Record<string, any>;
  validationErrors?: string[];
  unmappedFields?: string[];
}

interface UseAIExtractionTrackerOptions {
  documentId?: string;
  farmId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useAIExtractionTracker = (options: UseAIExtractionTrackerOptions = {}) => {
  const {
    documentId,
    farmId,
    autoRefresh = false,
    refreshInterval = 5000
  } = options;

  const [attempts, setAttempts] = useState<ExtractionAttempt[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<ExtractionAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  /**
   * Fetches extraction attempts for a document or farm
   */
  const fetchExtractionAttempts = useCallback(async () => {
    if (!documentId && !farmId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('document_extractions')
        .select(`
          *,
          farm_documents!inner(
            id,
            file_name,
            farm_id
          )
        `)
        .order('created_at', { ascending: false });

      if (documentId) {
        query = query.eq('document_id', documentId);
      } else if (farmId) {
        query = query.eq('farm_documents.farm_id', farmId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transformedAttempts: ExtractionAttempt[] = (data || []).map(extraction => {
        const extractedData = extraction.extracted_data as Record<string, any> || {};
        const status = extraction.status as 'pending' | 'processing' | 'completed' | 'failed';
        
        return {
          id: extraction.id,
          documentId: extraction.document_id,
          status: status || 'failed',
          confidence: extraction.confidence_score || 0,
          tokensUsed: extractedData.tokensUsed,
          processingTime: extractedData.processingTime,
          extractedFieldsCount: extractedData ? Object.keys(extractedData).length : 0,
          savedFieldsCount: extractedData ? Object.keys(extractedData).filter(key => 
            !['confidence', 'error', 'debugInfo', 'rawResponse', 'tokensUsed', 'processingTime'].includes(key)
          ).length : 0,
          model: extraction.extraction_type || 'unknown',
          errorMessage: extraction.error_message || undefined,
          createdAt: extraction.created_at,
          extractedData: extractedData,
          mappedData: extractedData.mappedData,
          validationErrors: extractedData.validationErrors || [],
          unmappedFields: extractedData.unmappedFields || []
        };
      });

      setAttempts(transformedAttempts);
      
      // Set current attempt to the latest one for the document
      if (documentId && transformedAttempts.length > 0) {
        setCurrentAttempt(transformedAttempts[0]);
      }

      logger.debug('Extraction attempts fetched', {
        documentId,
        farmId,
        attemptsCount: transformedAttempts.length
      });

    } catch (error) {
      console.error('Failed to fetch extraction attempts:', error);
      toast.error('Failed to load extraction history');
    } finally {
      setIsLoading(false);
    }
  }, [documentId, farmId]);

  /**
   * Starts tracking a new extraction attempt
   */
  const startTracking = useCallback(async (docId: string, fileName: string) => {
    setIsTracking(true);
    
    // Create a pending extraction record
    const pendingAttempt: ExtractionAttempt = {
      id: `pending-${Date.now()}`,
      documentId: docId,
      status: 'pending',
      confidence: 0,
      extractedFieldsCount: 0,
      savedFieldsCount: 0,
      model: 'hybrid-extraction',
      createdAt: new Date().toISOString()
    };

    setCurrentAttempt(pendingAttempt);
    
    logger.step('Started tracking AI extraction', {
      documentId: docId,
      fileName
    });

    toast.info(`AI extraction started for ${fileName}`, {
      description: 'Tracking extraction progress...'
    });

  }, []);

  /**
   * Updates tracking status during extraction
   */
  const updateTracking = useCallback((updates: Partial<ExtractionAttempt>) => {
    setCurrentAttempt(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  /**
   * Completes tracking and shows results
   */
  const completeTracking = useCallback(async (result: {
    success: boolean;
    extractionId?: string;
    extractedData?: any;
    confidence?: number;
    error?: string;
  }) => {
    if (currentAttempt) {
      const completedAttempt: ExtractionAttempt = {
        ...currentAttempt,
        id: result.extractionId || currentAttempt.id,
        status: result.success ? 'completed' : 'failed',
        confidence: result.confidence || 0,
        extractedData: result.extractedData,
        extractedFieldsCount: result.extractedData ? Object.keys(result.extractedData).length : 0,
        savedFieldsCount: result.extractedData ? Object.keys(result.extractedData).filter(key => 
          !['confidence', 'error', 'debugInfo', 'rawResponse'].includes(key)
        ).length : 0,
        errorMessage: result.error
      };

      setCurrentAttempt(completedAttempt);
      setAttempts(prev => [completedAttempt, ...prev.filter(a => a.id !== completedAttempt.id)]);
    }

    setIsTracking(false);

    // Show completion notification
    if (result.success) {
      toast.success('AI extraction completed successfully', {
        description: `${result.confidence}% confidence, ${Object.keys(result.extractedData || {}).length} fields extracted`
      });
    } else {
      toast.error('AI extraction failed', {
        description: result.error || 'Unknown error occurred'
      });
    }

    logger.debug('AI extraction tracking completed', {
      success: result.success,
      confidence: result.confidence,
      fieldCount: result.extractedData ? Object.keys(result.extractedData).length : 0
    });

  }, [currentAttempt]);

  /**
   * Downloads extraction log for debugging
   */
  const downloadExtractionLog = useCallback((attempt: ExtractionAttempt) => {
    const logData = {
      documentId: attempt.documentId,
      extractionId: attempt.id,
      status: attempt.status,
      confidence: attempt.confidence,
      model: attempt.model,
      tokensUsed: attempt.tokensUsed,
      processingTime: attempt.processingTime,
      extractedFields: attempt.extractedFieldsCount,
      savedFields: attempt.savedFieldsCount,
      errorMessage: attempt.errorMessage,
      extractedData: attempt.extractedData,
      mappedData: attempt.mappedData,
      validationErrors: attempt.validationErrors,
      unmappedFields: attempt.unmappedFields,
      timestamp: attempt.createdAt
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extraction-log-${attempt.id.slice(-8)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Extraction log downloaded');
  }, []);

  /**
   * Gets extraction statistics
   */
  const getExtractionStats = useCallback(() => {
    const total = attempts.length;
    const successful = attempts.filter(a => a.status === 'completed').length;
    const failed = attempts.filter(a => a.status === 'failed').length;
    const avgConfidence = attempts
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + a.confidence, 0) / (successful || 1);

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgConfidence: Math.round(avgConfidence)
    };
  }, [attempts]);

  // Auto-refresh extraction attempts
  useEffect(() => {
    if (autoRefresh && (documentId || farmId)) {
      const interval = setInterval(fetchExtractionAttempts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, documentId, farmId, refreshInterval, fetchExtractionAttempts]);

  // Initial fetch
  useEffect(() => {
    if (documentId || farmId) {
      fetchExtractionAttempts();
    }
  }, [documentId, farmId, fetchExtractionAttempts]);

  return {
    // State
    attempts,
    currentAttempt,
    isLoading,
    isTracking,
    
    // Actions
    fetchExtractionAttempts,
    startTracking,
    updateTracking,
    completeTracking,
    downloadExtractionLog,
    
    // Computed
    getExtractionStats,
    hasAttempts: attempts.length > 0,
    latestAttempt: attempts[0] || null,
    
    // Utilities
    refreshAttempts: fetchExtractionAttempts
  };
};