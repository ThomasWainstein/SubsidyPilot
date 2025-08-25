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

        // Fetch real subsidy matches for this farm (no mock data)
        const { data: subsidyMatches } = await supabase
          .from('subsidy_matches')
          .select(`
            id,
            confidence,
            created_at,
            subsidies (
              id,
              title,
              amount_max,
              deadline
            )
          `)
        .eq('farm_id', farmId)
        .eq('status', 'active');

      const totalMatches = subsidyMatches?.length || 0;

      // Only calculate metrics from real data
      const now = new Date();
      const newMatches = subsidyMatches?.filter(m => {
        const created = new Date(m.created_at);
        return now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }).length || 0;

      const expiringMatches = subsidyMatches?.filter(m => {
        const deadline = m.subsidies?.deadline;
        return !!deadline && new Date(deadline) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }).length || 0;

      // Only show top match if real data exists
      const topMatchData = subsidyMatches?.[0];
      const topMatch = topMatchData?.subsidies
        ? {
            id: topMatchData.id,
            title: topMatchData.subsidies.title || null,
            amount: topMatchData.subsidies.amount_max ? [0, topMatchData.subsidies.amount_max] : null,
            confidence: topMatchData.confidence,
          }
        : undefined;

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