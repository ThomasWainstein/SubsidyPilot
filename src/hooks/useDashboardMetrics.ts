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
        .select(`
          id,
          status,
          created_at,
          farm_id,
          farms(name)
        `)
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

      // For now, we'll use mock data for subsidy matches since the matching system
      // needs to be enhanced. In a real implementation, this would fetch from
      // a subsidies matching table or service.
      const mockSubsidyMatches = farmIds.length * 3; // Mock: 3 matches per farm
      const mockNewMatches = Math.floor(mockSubsidyMatches * 0.2); // 20% are new
      const mockExpiringMatches = Math.floor(mockSubsidyMatches * 0.1); // 10% expiring

      // Generate mock top matches
      const topMatches = farms?.slice(0, 3).map((farm, index) => ({
        id: `match-${farm.id}-${index}`,
        title: [
          'Agricultural Modernization Grant',
          'Organic Certification Support',
          'Green Technology Investment'
        ][index] || 'Agricultural Support Program',
        amount: [
          [5000, 25000],
          [10000, 50000],
          [15000, 75000]
        ][index] || [5000, 25000],
        deadline: new Date(Date.now() + (30 - index * 10) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        farmName: farm.name,
        confidence: [85, 92, 78][index] || 80
      })) || [];

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
            farmName: (app as any).farms?.name || 'Unknown Farm',
            daysLeft: Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
          };
        }) || [];

      return {
        totalSubsidyMatches: mockSubsidyMatches,
        newMatches: mockNewMatches,
        expiringMatches: mockExpiringMatches,
        applicationCount,
        activeApplications,
        approvedApplications,
        topMatches,
        urgentDeadlines
      };
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};