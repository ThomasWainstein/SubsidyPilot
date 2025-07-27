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
  metadata?: Record<string, unknown>;
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

      try {
        const [farmsRes, docsRes, appsRes] = await Promise.all([
          supabase
            .from('farms')
            .select('id, name, address, total_hectares, legal_status, land_use_types')
            .in('id', farmIds),
          supabase
            .from('farm_documents')
            .select('farm_id, category')
            .in('farm_id', farmIds),
          supabase
            .from('applications')
            .select('id, status, submitted_at, farm_id')
            .in('farm_id', farmIds)
            .in('status', ['submitted', 'under_review']),
        ]);

        if (farmsRes.error) throw farmsRes.error;
        if (docsRes.error) throw docsRes.error;
        if (appsRes.error) throw appsRes.error;

        const farmMap = farmsRes.data?.reduce((acc, farm) => {
          acc[farm.id] = farm.name;
          return acc;
        }, {} as Record<string, string>) || {};

        const alerts: Alert[] = [];

        // Check for missing documents
        const docsByFarm = docsRes.data?.reduce((acc, doc) => {
          if (!acc[doc.farm_id]) acc[doc.farm_id] = [];
          acc[doc.farm_id].push(doc.category);
          return acc;
        }, {} as Record<string, string[]>) || {};

        farmIds.forEach(farmId => {
          const uploadedCategories = docsByFarm[farmId] || [];
          const requiredCategories = REQUIRED_DOCUMENT_CATEGORIES;
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
              metadata: { missingCategories },
            });
          }
        });

        // Check for expiring deadlines
        if (appsRes.data) {
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          appsRes.data.forEach(app => {
            if (app.submitted_at) {
              const submittedDate = new Date(app.submitted_at);
              const estimatedDeadline = new Date(submittedDate.getTime() + 90 * 24 * 60 * 60 * 1000);

              if (estimatedDeadline <= thirtyDaysFromNow) {
                const daysLeft = Math.ceil((estimatedDeadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

                alerts.push({
                  id: `deadline-${app.id}`,
                  type: 'expiring_deadline',
                  priority: daysLeft <= 7 ? 'high' : 'medium',
                  title: 'Application Deadline Approaching',
                  description: `Response expected in ${daysLeft} days`,
                  farmId: app.farm_id,
                  farmName: farmMap[app.farm_id] || 'Unknown Farm',
                  createdAt: new Date().toISOString(),
                  metadata: { applicationId: app.id, daysLeft },
                });
              }
            }
          });
        }

        // Check for incomplete profiles
        farmsRes.data?.forEach(farm => {
          const missingFields = [];
          if (!farm.address) missingFields.push('address');
          if (!farm.total_hectares) missingFields.push('farm size');
          if (!farm.legal_status) missingFields.push('legal status');
          if (!farm.land_use_types || farm.land_use_types.length === 0) missingFields.push('land use types');

          if (missingFields.length > 0) {
            alerts.push({
              id: `incomplete-profile-${farm.id}`,
              type: 'profile_incomplete',
              priority: 'low',
              title: 'Profile Incomplete',
              description: `${missingFields.length} fields need completion`,
              farmId: farm.id,
              farmName: farm.name,
              createdAt: new Date().toISOString(),
              metadata: { missingFields }
            });
          }
        });

        // Sort by priority and creation date
        return alerts.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      } catch (error) {
        console.error('Error fetching alerts:', error);
        return [];
      }
    },
    enabled: !!user?.id && farmIds.length > 0,
    refetchInterval: 2 * 60 * 1000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user?.id) return;
      // For now, just remove from local state since user_alerts might not be in types yet
      return alertId;
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