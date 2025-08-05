import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type DocumentExtraction = Tables<'document_extractions'>;
type FarmDocument = Tables<'farm_documents'>;

export interface DocumentForReview {
  id: string;
  file_name: string;
  file_url: string;
  category: string;
  uploaded_at: string;
  extraction?: DocumentExtraction;
  needsReview: boolean;
  reviewPriority: 'high' | 'medium' | 'low';
}

export interface ReviewCorrection {
  extractionId: string;
  originalData?: Record<string, any>;
  correctedData: Record<string, any>;
  reviewerNotes?: string;
  status: 'reviewed' | 'flagged' | 'approved';
}

export const useDocumentsForReview = (farmId: string, filters?: {
  status?: string;
  confidence?: number;
  category?: string;
}) => {
  return useQuery({
    queryKey: ['documents-for-review', farmId, filters],
    queryFn: async (): Promise<DocumentForReview[]> => {
      let query = supabase
        .from('farm_documents')
        .select(`
          *,
          document_extractions(*)
        `)
        .eq('farm_id', farmId)
        .order('uploaded_at', { ascending: false });

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category as any);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching documents for review:', error);
        throw error;
      }

      return (data || []).map((doc: any) => {
        const latestExtraction = doc.document_extractions?.[0];
        const needsReview = !latestExtraction || 
                           latestExtraction.status === 'failed' ||
                           (latestExtraction.confidence_score || 0) < 70;
        
        const reviewPriority: 'high' | 'medium' | 'low' = needsReview 
          ? (latestExtraction?.confidence_score || 0) < 50 ? 'high' : 'medium'
          : 'low';

        return {
          id: doc.id,
          file_name: doc.file_name,
          file_url: doc.file_url,
          category: doc.category,
          uploaded_at: doc.uploaded_at,
          extraction: latestExtraction,
          needsReview,
          reviewPriority
        };
      }).filter((doc: DocumentForReview) => {
        if (filters?.confidence !== undefined) {
          return !doc.extraction || (doc.extraction.confidence_score || 0) <= filters.confidence;
        }
        return true;
      });
    },
    enabled: !!farmId,
  });
};

export const useDocumentReviewDetail = (documentId: string) => {
  return useQuery({
    queryKey: ['document-review-detail', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farm_documents')
        .select(`
          *,
          document_extractions(*),
          farms(*)
        `)
        .eq('id', documentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });
};

export const useSubmitReviewCorrection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ correction }: { correction: ReviewCorrection }) => {
      // Update the extraction with corrected data
      const { error: updateError } = await supabase
        .from('document_extractions')
        .update({
          extracted_data: correction.correctedData,
          debug_info: {
            ...correction.correctedData,
            reviewStatus: correction.status,
            reviewerNotes: correction.reviewerNotes,
            reviewedAt: new Date().toISOString(),
            reviewedBy: (await supabase.auth.getUser()).data.user?.id
          }
        })
        .eq('id', correction.extractionId);

      if (updateError) throw updateError;

      // Insert audit record into document_extraction_reviews
      const { error: auditError } = await supabase
        .from('document_extraction_reviews')
        .insert({
          extraction_id: correction.extractionId,
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
          original_data: correction.originalData || {},
          corrected_data: correction.correctedData,
          reviewer_notes: correction.reviewerNotes,
          review_status: correction.status
        });

      if (auditError) {
        console.warn('Failed to log review audit:', auditError);
        // Don't throw - audit logging failure shouldn't block the main operation
      }

      return { success: true };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['document-review-detail'] });
      queryClient.invalidateQueries({ queryKey: ['document-extractions'] });
      
      toast({
        title: 'Review submitted',
        description: 'Your corrections have been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Review submission failed:', error);
      toast({
        title: 'Review submission failed',
        description: 'There was an error saving your corrections. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

export const useReviewStatistics = (farmId: string) => {
  return useQuery({
    queryKey: ['review-statistics', farmId],
    queryFn: async () => {
      const { data: documents, error } = await supabase
        .from('farm_documents')
        .select(`
          id,
          document_extractions(status, confidence_score, created_at)
        `)
        .eq('farm_id', farmId);

      if (error) throw error;

      const stats = {
        total: documents.length,
        needsReview: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        averageConfidence: 0,
        completedReviews: 0
      };

      let totalConfidence = 0;
      let extractedDocs = 0;

      documents.forEach((doc: any) => {
        const extraction = doc.document_extractions?.[0];
        const confidence = extraction?.confidence_score || 0;
        
        if (extraction) {
          extractedDocs++;
          totalConfidence += confidence;
        }

        const needsReview = !extraction || 
                           extraction.status === 'failed' ||
                           confidence < 70;
        
        if (needsReview) {
          stats.needsReview++;
          if (confidence < 50) stats.highPriority++;
          else stats.mediumPriority++;
        } else {
          stats.lowPriority++;
          stats.completedReviews++;
        }
      });

      stats.averageConfidence = extractedDocs > 0 ? totalConfidence / extractedDocs : 0;

      return stats;
    },
    enabled: !!farmId,
  });
};