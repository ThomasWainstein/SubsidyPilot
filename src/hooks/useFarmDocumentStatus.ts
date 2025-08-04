import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const POLLING_INTERVAL = 2000; // Poll every 2 seconds

export interface DocumentStatus {
  status: 'completed' | 'failed' | 'processing' | 'not_extracted';
  confidence_score: number | null;
  error_message: string | null;
  field_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export const useFarmDocumentStatus = (documentId: string) => {
  return useQuery<DocumentStatus>({
    queryKey: ['farm-document-status', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('status, confidence_score, error_message, extracted_data, created_at, updated_at')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          status: 'not_extracted',
          confidence_score: null,
          error_message: null,
          field_count: 0,
          created_at: null,
          updated_at: null,
        };
      }

      const extracted = (data.extracted_data ?? {}) as Record<string, unknown>;
      const fieldCount = Object.keys(extracted).length;

      return {
        status: data.status as DocumentStatus['status'],
        confidence_score: data.confidence_score,
        error_message: data.error_message,
        field_count: fieldCount,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    enabled: !!documentId,
    refetchInterval: POLLING_INTERVAL,
  });
};

export default useFarmDocumentStatus;
