import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { REQUIRED_DOCUMENT_CATEGORIES } from '@/utils/requiredDocumentCategories';

interface FarmMetrics {
  totalMatches: number;
  newMatches: number;
  expiringMatches: number;
  urgentDeadlines: number;
  missingDocuments: number;
  topMatch?: {
    id: string;
    title: string;
    amount: number[] | null;
    confidence: number;
  };
}

export const useFarmMetrics = (farmId: string) => {
  return useQuery({
    queryKey: ['farm-metrics', farmId],
    queryFn: async (): Promise<FarmMetrics> => {
      // Fetch applications for this farm
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id, status, created_at, submitted_at')
        .eq('farm_id', farmId);

      if (appsError) throw appsError;

      // Fetch documents for this farm
      const { data: documents, error: docsError } = await supabase
        .from('farm_documents')
        .select('id, category, uploaded_at')
        .eq('farm_id', farmId);

      if (docsError) throw docsError;

      // Calculate urgent deadlines (applications submitted/in review with deadlines < 30 days)
      const urgentDeadlines = applications?.filter(app => 
        ['submitted', 'in_review'].includes(app.status) &&
        app.submitted_at &&
        new Date(app.submitted_at).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)
      ).length || 0;

      // Check for missing critical documents - using proper enum values
      const requiredCategories = REQUIRED_DOCUMENT_CATEGORIES;
      const uploadedCategories = documents?.map(doc => doc.category) || [];
      const missingDocuments = requiredCategories.filter(cat => 
        !uploadedCategories.includes(cat)
      ).length;

      // Simplified metrics without subsidy_matches for now
      const totalMatches = 0;
      const newMatches = 0;
      const expiringMatches = 0;
      const topMatch = undefined;

      return {
        totalMatches,
        newMatches,
        expiringMatches,
        urgentDeadlines,
        missingDocuments,
        topMatch
      };
    },
    enabled: !!farmId,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes (reduced from 5)
    refetchOnWindowFocus: false, // Don't refetch on every window focus
  });
};