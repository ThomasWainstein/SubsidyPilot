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

      // Fetch subsidy matches for this farm
      const { data: matches, error: matchesError } = await supabase
        .from('subsidy_matches')
        .select(`
          id,
          confidence,
          created_at,
          subsidies_structured(id, title, amount, deadline)
        `)
        .eq('farm_id', farmId)
        .order('confidence', { ascending: false });

      if (matchesError) throw matchesError;

      const totalMatches = matches?.length || 0;

      const now = new Date();
      const newMatches = matches?.filter(m => {
        const created = new Date(m.created_at as string);
        return now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }).length || 0;

      const expiringMatches = matches?.filter(m => {
        const deadline = (m as any).subsidies_structured?.deadline as string | null;
        return !!deadline && new Date(deadline) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }).length || 0;

      const topMatchData = (matches || [])[0];
      const topMatch = topMatchData
        ? {
            id: topMatchData.id as string,
            title: (topMatchData as any).subsidies_structured?.title as string,
            amount: (topMatchData as any).subsidies_structured?.amount as number[] | null,
            confidence: topMatchData.confidence as number,
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
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};