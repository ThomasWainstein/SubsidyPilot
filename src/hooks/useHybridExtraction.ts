import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractionResult {
  extractedFields: Record<string, any>;
  confidence: number;
  source: 'rule-based' | 'ai-based' | 'merged' | 'error';
  timestamp: string;
  fieldsCount: number;
  debugInfo?: any;
}

interface UseHybridExtractionOptions {
  onSuccess?: (result: ExtractionResult) => void;
  onError?: (error: Error) => void;
}

export const useHybridExtraction = (options: UseHybridExtractionOptions = {}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const extractFromDocument = async (documentUrl: string, documentId: string, forceAI = false) => {
    setIsExtracting(true);
    setError(null);
    
    try {
      console.log('Starting hybrid extraction:', { documentId, forceAI });
      
      const { data, error: functionError } = await supabase.functions.invoke('hybrid-extraction', {
        body: {
          documentUrl,
          documentId,
          forceAI
        }
      });

      if (functionError) {
        throw new Error(`Extraction function error: ${functionError.message}`);
      }

      if (!data) {
        throw new Error('No data returned from extraction function');
      }

      const result = data as ExtractionResult;
      
      // Transform field sources from metadata if available
      if (result.extractedFields._fieldSources) {
        const sources = result.extractedFields._fieldSources;
        delete result.extractedFields._fieldSources; // Remove metadata from fields
        
        // Add source info to result for UI display
        result.debugInfo = {
          ...result.debugInfo,
          fieldSources: sources
        };
      }

      console.log('Extraction completed:', {
        source: result.source,
        fieldsCount: result.fieldsCount,
        confidence: result.confidence
      });

      setExtractionResult(result);
      
      // Show success toast based on extraction method
      if (result.source === 'merged') {
        toast.success('Document processed using hybrid extraction (rule-based + AI)');
      } else if (result.source === 'ai-based') {
        toast.success('Document processed using AI extraction');
      } else if (result.source === 'rule-based') {
        toast.success('Document processed using rule-based extraction');
      }

      options.onSuccess?.(result);
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown extraction error');
      console.error('Extraction failed:', error);
      
      setError(error);
      toast.error(`Extraction failed: ${error.message}`);
      
      options.onError?.(error);
      throw error;
    } finally {
      setIsExtracting(false);
    }
  };

  const retryWithAI = async (documentUrl: string, documentId: string) => {
    return extractFromDocument(documentUrl, documentId, true);
  };

  const reset = () => {
    setExtractionResult(null);
    setError(null);
    setIsExtracting(false);
  };

  return {
    extractFromDocument,
    retryWithAI,
    reset,
    isExtracting,
    extractionResult,
    error,
    // Computed properties for UI
    hasResults: extractionResult !== null,
    isHybridExtraction: extractionResult?.source === 'merged',
    isAIExtraction: extractionResult?.source === 'ai-based',
    isRuleBasedExtraction: extractionResult?.source === 'rule-based',
    fieldCount: extractionResult?.fieldsCount || 0,
    confidence: extractionResult?.confidence || 0,
  };
};

export default useHybridExtraction;