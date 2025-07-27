import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardMetrics {
  totalSubsidyMatches: number;
  newMatches: number;
  expiringMatches: number;
  applicationCount: number;
  activeApplications: number;
  approvedApplications: number;
  topMatches: Array<{
    id: string;
    title: string;
    amount: number[] | null;
    deadline: string | null;
    farmName: string;
    confidence: number;
  }>;
  urgentDeadlines: Array<{
    id: string;
    title: string;
    deadline: string;
    farmName: string;
    daysLeft: number;
  }>;
}

export const useDashboardMetrics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dashboard-metrics', user?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        // Fetch user's farms
        const { data: farms, error: farmsError } = await supabase
          .from('farms')
          .select('id, name')
          .eq('user_id', user.id);

        if (farmsError) throw farmsError;

        const farmIds = farms?.map(f => f.id) || [];

        // Fetch applications for user's farms
        const { data: applications, error: appsError } = await supabase
          .from('applications')
          .select('id, status, created_at, farm_id')
          .in('farm_id', farmIds);

        if (appsError) throw appsError;

        // Calculate application metrics
        const applicationCount = applications?.length || 0;
        const activeApplications = applications?.filter(app => 
          ['draft', 'submitted', 'under_review'].includes(app.status)
        ).length || 0;
        const approvedApplications = applications?.filter(app => 
          app.status === 'approved'
        ).length || 0;

        // Mock subsidy matches for now (will be replaced with real data)
        const mockMatches = farmIds.map((farmId, index) => ({
          id: `match-${farmId}-${index}`,
          farm_id: farmId,
          confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          subsidies_structured: {
            id: `subsidy-${index}`,
            title: ['Agricultural Modernization Grant', 'Organic Farming Support', 'Rural Development Fund'][index % 3],
            amount: [10000, 50000],
            deadline: new Date(Date.now() + (30 + index * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        }));

        const totalSubsidyMatches = mockMatches.length;
        const now = new Date();
        
        const newMatches = mockMatches.filter(m => {
          const created = new Date(m.created_at);
          return now.getTime() - created.getTime() <= 7 * 24 * 60 * 60 * 1000;
        }).length;

        const expiringMatches = mockMatches.filter(m => {
          const deadline = m.subsidies_structured?.deadline;
          return !!deadline && new Date(deadline) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }).length;

        const topMatches = mockMatches.slice(0, 3).map(m => ({
          id: m.id,
          title: m.subsidies_structured?.title || 'Subsidy Program',
          amount: m.subsidies_structured?.amount || null,
          deadline: m.subsidies_structured?.deadline || null,
          farmName: farms?.find(f => f.id === m.farm_id)?.name || 'Unknown Farm',
          confidence: m.confidence
        }));

        // Generate urgent deadlines from recent applications
        const urgentDeadlines = applications
          ?.filter(app => ['submitted', 'under_review'].includes(app.status))
          .slice(0, 3)
          .map((app, index) => {
            const deadline = new Date(Date.now() + (15 - index * 5) * 24 * 60 * 60 * 1000);
            return {
              id: app.id,
              title: `Application #${app.id.slice(-6)}`,
              deadline: deadline.toISOString().split('T')[0],
              farmName: farms?.find(f => f.id === app.farm_id)?.name || 'Unknown Farm',
              daysLeft: Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
            };
          }) || [];

        return {
          totalSubsidyMatches,
          newMatches,
          expiringMatches,
          applicationCount,
          activeApplications,
          approvedApplications,
          topMatches,
          urgentDeadlines
        };
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        // Return empty metrics on error
        return {
          totalSubsidyMatches: 0,
          newMatches: 0,
          expiringMatches: 0,
          applicationCount: 0,
          activeApplications: 0,
          approvedApplications: 0,
          topMatches: [],
          urgentDeadlines: []
        };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000,
  });
};