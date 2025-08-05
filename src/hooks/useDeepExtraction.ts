import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseDeepExtractionOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useDeepExtraction = (options: UseDeepExtractionOptions = {}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const startDeepExtraction = async (url: string, forceReprocess = false) => {
    setIsExtracting(true);
    setError(null);
    setExtractionResult(null);

    try {
      const { data, error: extractionError } = await supabase.functions.invoke(
        'deep-structural-extraction',
        {
          body: { url, forceReprocess }
        }
      );

      if (extractionError) {
        throw new Error(extractionError.message || 'Extraction failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      setExtractionResult(data.data);
      toast.success('Extraction structurelle terminée avec succès');
      options.onSuccess?.(data.data);

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'extraction';
      setError(errorMessage);
      toast.error(`Erreur d'extraction: ${errorMessage}`);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  };

  const reset = () => {
    setIsExtracting(false);
    setError(null);
    setExtractionResult(null);
  };

  return {
    startDeepExtraction,
    isExtracting,
    extractionResult,
    error,
    reset
  };
};