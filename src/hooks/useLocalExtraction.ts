/**
 * Hook for managing local transformer-based document extraction
 */
import { useState, useCallback } from 'react';
import { getLocalExtractor, LocalExtractionResult } from '@/services/localTransformerExtraction';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface UseLocalExtractionReturn {
  isExtracting: boolean;
  lastResult: LocalExtractionResult | null;
  extractLocally: (documentId: string, text: string, documentType: string) => Promise<LocalExtractionResult | null>;
  isReady: boolean;
  confidenceThreshold: number;
  setConfidenceThreshold: (threshold: number) => void;
}

export const useLocalExtraction = (): UseLocalExtractionReturn => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastResult, setLastResult] = useState<LocalExtractionResult | null>(null);
  const [confidenceThreshold, setConfidenceThresholdState] = useState(0.7);

  const extractor = getLocalExtractor();

  const extractLocally = useCallback(async (
    documentId: string,
    text: string,
    documentType: string
  ): Promise<LocalExtractionResult | null> => {
    setIsExtracting(true);
    
    try {
      logger.debug('🔄 Starting local extraction for document', { documentId });
      
      const result = await extractor.extractFromText(text, documentType);
      setLastResult(result);
      
      // Log the local extraction attempt
      await logLocalExtractionAttempt(documentId, result);
      
      // Show success/warning messages based on result
      if (result.errorMessage) {
        toast.error('Local extraction failed', {
          description: 'Falling back to cloud extraction'
        });
      } else if (result.fallbackRecommended) {
        toast.warning('Low confidence local extraction', {
          description: `Confidence: ${(result.overallConfidence * 100).toFixed(1)}%. Fallback recommended.`
        });
      } else {
        toast.success('Local extraction completed', {
          description: `Extracted ${result.extractedFields.length} fields with ${(result.overallConfidence * 100).toFixed(1)}% confidence`
        });
      }
      
      logger.debug('✅ Local extraction completed', {
        fields: result.extractedFields.length,
        confidence: result.overallConfidence,
        fallbackRecommended: result.fallbackRecommended,
        processingTime: result.processingTime
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Local extraction error:', error);
      
      const errorResult: LocalExtractionResult = {
        extractedFields: [],
        overallConfidence: 0,
        processingTime: 0,
        modelUsed: 'local-transformers-v1',
        fallbackRecommended: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setLastResult(errorResult);
      await logLocalExtractionAttempt(documentId, errorResult);
      
      toast.error('Local extraction failed', {
        description: 'Will attempt cloud extraction instead'
      });
      
      return errorResult;
      
    } finally {
      setIsExtracting(false);
    }
  }, [extractor]);

  const setConfidenceThreshold = useCallback((threshold: number) => {
    setConfidenceThresholdState(threshold);
    extractor.setConfidenceThreshold(threshold);
  }, [extractor]);

  return {
    isExtracting,
    lastResult,
    extractLocally,
    isReady: extractor.isReady(),
    confidenceThreshold,
    setConfidenceThreshold
  };
};

// Helper function to log local extraction attempts
const logLocalExtractionAttempt = async (
  documentId: string,
  result: LocalExtractionResult
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        extraction_type: 'local_transformer',
        status: result.errorMessage ? 'failed' : 'completed',
        confidence_score: result.overallConfidence,
        extracted_data: {
          fields: result.extractedFields.map(field => ({
            field: field.field,
            value: field.value,
            confidence: field.confidence,
            startIndex: field.startIndex,
            endIndex: field.endIndex
          })),
          modelUsed: result.modelUsed,
          processingTime: result.processingTime,
          fallbackRecommended: result.fallbackRecommended
        },
        error_message: result.errorMessage,
        debug_info: {
          extractionMethod: 'local',
          fieldCount: result.extractedFields.length,
          averageFieldConfidence: result.extractedFields.length > 0 
            ? result.extractedFields.reduce((sum, f) => sum + f.confidence, 0) / result.extractedFields.length 
            : 0
        }
      });

    if (error) {
      console.error('Failed to log local extraction attempt:', error);
    }
  } catch (error) {
    console.error('Error logging local extraction attempt:', error);
  }
};