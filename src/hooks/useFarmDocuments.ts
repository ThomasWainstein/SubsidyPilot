
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

export interface FarmDocument {
  id: string;
  farm_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  category: string;
  uploaded_at: string | null;
  // Enhanced metadata
  file_hash?: string | null;
  page_count?: number | null;
  language_detected?: string | null;
  processing_status?: string | null;
  error_details?: any;
  scan_results?: {
    scan_vendor?: string;
    scan_time?: string;
    threats_detected?: string[];
    clean?: boolean;
    scan_id?: string;
    confidence?: number;
    metadata?: any;
  } | null | any; // Allow any for JSONB compatibility
}

export const useFarmDocuments = (farmId: string) => {
  return useQuery({
    queryKey: ['farm-documents', farmId],
    queryFn: async (): Promise<FarmDocument[]> => {
      const { data, error } = await supabase
        .from('farm_documents')
        .select('*')
        .eq('farm_id', farmId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching farm documents:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!farmId,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      file, 
      farmId, 
      category 
    }: { 
      file: File; 
      farmId: string; 
      category: string; 
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('farmId', farmId);
      formData.append('category', category);

      const { data, error } = await supabase.functions.invoke('upload-farm-document', {
        body: formData,
      });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch documents for this farm immediately
      queryClient.invalidateQueries({ queryKey: ['farm-documents', variables.farmId] });
      // Force immediate refetch to ensure real-time updates
      queryClient.refetchQueries({ queryKey: ['farm-documents', variables.farmId] });
      
      logger.debug('✅ Document upload successful, refreshing document list', { file: variables.file.name });
    },
    onError: (error: any) => {
      console.error('Document upload failed:', error);
      
      // Show specific error message if available
      const errorMessage = error?.message || 
                           error?.details || 
                           'Unable to upload document. Please check the file and try again.';
      
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, farmId }: { documentId: string; farmId: string }) => {
      // First get the document to find the file path
      const { data: document, error: fetchError } = await supabase
        .from('farm_documents')
        .select('file_url, farm_id')
        .eq('id', documentId)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found');
      }

      // Extract file path from URL
      const url = new URL(document.file_url);
      const filePath = url.pathname.split('/').slice(-3).join('/'); // Get last 3 parts: farmId/category/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('farm-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('farm_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      return { success: true };
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch documents for this farm
      queryClient.invalidateQueries({ queryKey: ['farm-documents', variables.farmId] });
      
      toast({
        title: 'Document deleted',
        description: 'The document has been removed from your farm.',
      });
    },
    onError: (error) => {
      console.error('Document deletion failed:', error);
      toast({
        title: 'Deletion failed',
        description: 'There was an error deleting the document. Please try again.',
        variant: 'destructive',
      });
    },
  });
};
