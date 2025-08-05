import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FarmDocumentExtractionStatus {
  status: 'not_extracted' | 'processing' | 'completed' | 'failed';
  fieldCount?: number;
  lastUpdated?: string;
  error?: string;
}

export const useFarmDocumentExtractionStatus = (
  documentId?: string,
  refetchInterval?: number
) => {
  const [extractionStatus, setExtractionStatus] = useState<FarmDocumentExtractionStatus>({
    status: 'not_extracted'
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = useCallback(async (docId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('farm_document_extraction_status')
        .select('*')
        .eq('document_id', docId)
        .maybeSingle();

      if (error || !data) {
        setExtractionStatus({ status: 'not_extracted' });
        return;
      }

      setExtractionStatus({
        status: data.status as any,
        fieldCount: data.field_count,
        lastUpdated: data.last_updated,
        error: data.error || undefined,
      });
    } catch (err) {
      console.error('Error fetching farm document extraction status:', err);
      setExtractionStatus({ status: 'not_extracted' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!documentId) return;

    refreshStatus(documentId);

    if (refetchInterval) {
      const interval = setInterval(() => refreshStatus(documentId), refetchInterval);
      return () => clearInterval(interval);
    }
  }, [documentId, refreshStatus, refetchInterval]);

  return {
    extractionStatus,
    isLoading,
    refreshStatus,
  };
};
