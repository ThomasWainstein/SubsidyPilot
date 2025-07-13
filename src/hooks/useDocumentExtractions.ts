import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type DocumentExtraction = Tables<'document_extractions'>;

export const useDocumentExtractions = (documentId: string) => {
  return useQuery({
    queryKey: ['document-extractions', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DocumentExtraction[];
    },
    enabled: !!documentId,
  });
};

export const useLatestDocumentExtraction = (documentId: string) => {
  return useQuery({
    queryKey: ['latest-document-extraction', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('document_id', documentId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as DocumentExtraction | null;
    },
    enabled: !!documentId,
  });
};

export const useFarmDocumentExtractions = (farmId: string) => {
  return useQuery({
    queryKey: ['farm-document-extractions', farmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_extractions')
        .select(`
          *,
          farm_documents!inner(
            id,
            file_name,
            category,
            farm_id
          )
        `)
        .eq('farm_documents.farm_id', farmId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!farmId,
  });
};