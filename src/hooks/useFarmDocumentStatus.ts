import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Poll every 2 seconds for status updates
const POLLING_INTERVAL = 2000;

type DocumentStatus = Pick<
  Tables<'document_extractions'>,
  'status' | 'confidence_score' | 'error_message' | 'created_at' | 'updated_at'
>;

/**
 * Polls the document_extractions table for the latest status of a document.
 * Returns null if no extraction has been recorded yet.
 */
export const useFarmDocumentStatus = (documentId: string) => {
  return useQuery<DocumentStatus | null>({
    queryKey: ['farm-document-status', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('status, confidence_score, error_message, created_at, updated_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as DocumentStatus | null;
    },
    enabled: !!documentId,
    refetchInterval: POLLING_INTERVAL,
  });
};
