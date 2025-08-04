import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const POLLING_INTERVAL = 2000; // Poll every 2 seconds

export type DocumentStatus = Pick<
  Tables<'document_extractions'>,
  'status' | 'confidence_score' | 'error_message' | 'created_at' | 'updated_at'
>;

export const useFarmDocumentStatus = (documentId: string) => {
  return useQuery({
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

export default useFarmDocumentStatus;
