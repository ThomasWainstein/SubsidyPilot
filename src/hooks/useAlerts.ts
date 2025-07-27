import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { REQUIRED_DOCUMENT_CATEGORIES } from '@/utils/requiredDocumentCategories';

interface Alert {
  id: string;
  type: 'missing_document' | 'expiring_deadline' | 'new_subsidy_match' | 'profile_incomplete' | 'document_expiry';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  farmId: string;
  farmName: string;
  createdAt: string;
  metadata?: any;
}

export const useAlerts = (farmIds: string[]) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['alerts', farmIds],
    queryFn: async (): Promise<Alert[]> => {
      if (!user?.id || farmIds.length === 0) {
        return [];
      }

      // Fetch farms for name mapping
      const { data: farms, error: farmsError } = await supabase
        .from('farms')
        .select('id, name')
        .in('id', farmIds);

      if (farmsError) throw farmsError;

      const farmMap = farms?.reduce((acc, farm) => {
        acc[farm.id] = farm.name;
        return acc;
      }, {} as Record<string, string>) || {};

      const alerts: Alert[] = [];

      // Check for missing documents
      for (const farmId of farmIds) {
        const { data: documents, error: docsError } = await supabase
          .from('farm_documents')
          .select('category')
          .eq('farm_id', farmId);

        if (docsError) continue;

        const requiredCategories = REQUIRED_DOCUMENT_CATEGORIES;
        const uploadedCategories = documents?.map(doc => doc.category) || [];
        const missingCategories = requiredCategories.filter(cat => 
          !uploadedCategories.includes(cat)
        );

        if (missingCategories.length > 0) {
          alerts.push({
            id: `missing-docs-${farmId}`,
            type: 'missing_document',
            priority: 'high',
            title: 'Missing Required Documents',
            description: `${missingCategories.length} required documents missing`,
            farmId,
            farmName: farmMap[farmId] || 'Unknown Farm',
            createdAt: new Date().toISOString(),
            metadata: { missingCategories }
          });
        }
      }

      // Check for urgent application deadlines
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          farm_id,
          farms(name)
        `)
        .in('farm_id', farmIds)
        .in('status', ['submitted', 'under_review']);

      if (!appsError && applications) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        applications.forEach(app => {
          if (app.submitted_at) {
            const submittedDate = new Date(app.submitted_at);
            const estimatedDeadline = new Date(submittedDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days estimated processing

            if (estimatedDeadline <= thirtyDaysFromNow) {
              const daysLeft = Math.ceil((estimatedDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
              
              alerts.push({
                id: `deadline-${app.id}`,
                type: 'expiring_deadline',
                priority: daysLeft <= 7 ? 'high' : 'medium',
                title: 'Application Deadline Approaching',
                description: `Response expected in ${daysLeft} days`,
                farmId: app.farm_id,
                farmName: (app as any).farms?.name || farmMap[app.farm_id] || 'Unknown Farm',
                createdAt: new Date().toISOString(),
                metadata: { applicationId: app.id, daysLeft }
              });
            }
          }
        });
      }

      // Mock new subsidy matches (in real implementation, this would come from matching service)
      farmIds.forEach(farmId => {
        if (Math.random() > 0.7) { // 30% chance of new matches
          alerts.push({
            id: `new-match-${farmId}`,
            type: 'new_subsidy_match',
            priority: 'medium',
            title: 'New Subsidy Match Found',
            description: 'A new high-confidence subsidy match is available',
            farmId,
            farmName: farmMap[farmId] || 'Unknown Farm',
            createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 24h
            metadata: { confidence: Math.floor(Math.random() * 20) + 80 } // 80-100% confidence
          });
        }
      });

      // Check for incomplete profiles
      for (const farmId of farmIds) {
        const { data: farm, error: farmError } = await supabase
          .from('farms')
          .select('name, address, total_hectares, legal_status, land_use_types')
          .eq('id', farmId)
          .single();

        if (farmError) continue;

        const missingFields = [];
        if (!farm.address) missingFields.push('address');
        if (!farm.total_hectares) missingFields.push('farm size');
        if (!farm.legal_status) missingFields.push('legal status');
        if (!farm.land_use_types || farm.land_use_types.length === 0) missingFields.push('land use types');

        if (missingFields.length > 0) {
          alerts.push({
            id: `incomplete-profile-${farmId}`,
            type: 'profile_incomplete',
            priority: 'low',
            title: 'Profile Incomplete',
            description: `${missingFields.length} fields need completion`,
            farmId,
            farmName: farm.name,
            createdAt: new Date().toISOString(),
            metadata: { missingFields }
          });
        }
      }

      // Sort by priority and creation date
      return alerts.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
    enabled: !!user?.id && farmIds.length > 0,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // In a real implementation, this would store dismissed alerts in the database
      // For now, we'll just remove it from the cache
      return Promise.resolve();
    },
    onSuccess: (_, alertId) => {
      queryClient.setQueryData(['alerts', farmIds], (oldData: Alert[] | undefined) => {
        return oldData?.filter(alert => alert.id !== alertId) || [];
      });
    },
  });

  return {
    data: alertsQuery.data,
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    dismissAlert: dismissMutation.mutate,
  };
};