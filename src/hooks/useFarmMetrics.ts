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

      // Mock subsidy matching data - in real implementation, this would come from matching service
      const mockTotalMatches = Math.floor(Math.random() * 8) + 3; // 3-10 matches
      const mockNewMatches = Math.floor(mockTotalMatches * 0.2); // 20% new
      const mockExpiringMatches = Math.floor(mockTotalMatches * 0.1); // 10% expiring

      // Mock top match
      const mockTopMatch = {
        id: `top-match-${farmId}`,
        title: [
          'Agricultural Modernization Grant',
          'Organic Certification Support',
          'Green Technology Investment',
          'Sustainable Farming Initiative',
          'Rural Development Fund'
        ][Math.floor(Math.random() * 5)],
        amount: [
          [5000, 25000],
          [10000, 50000],
          [15000, 75000],
          [8000, 35000],
          [12000, 60000]
        ][Math.floor(Math.random() * 5)],
        confidence: Math.floor(Math.random() * 25) + 70 // 70-95%
      };

      return {
        totalMatches: mockTotalMatches,
        newMatches: mockNewMatches,
        expiringMatches: mockExpiringMatches,
        urgentDeadlines,
        missingDocuments,
        topMatch: mockTopMatch
      };
    },
    enabled: !!farmId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};