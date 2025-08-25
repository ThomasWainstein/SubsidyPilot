import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubsidyEligibilityService } from '@/services/subsidyEligibilityService';

interface PortfolioMetrics {
  totalFarms: number;
  totalHectares: number;
  readyForApplications: number;
  incompleteProfiles: number;
  totalFundingAvailable: number;
  totalBlockedValue: number;
  urgentDeadlines: number;
  topOpportunities: Array<{
    farmName: string;
    subsidyTitle: string;
    amount: number;
    deadline: string | null;
    action: string;
  }>;
}

export const usePortfolioMetrics = (userId: string) => {
  return useQuery({
    queryKey: ['portfolio-metrics', userId],
    queryFn: async (): Promise<PortfolioMetrics | null> => {
      if (!userId) return null;

      // Fetch user's farms
      const { data: farms, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', userId);

      if (farmsError) throw farmsError;
      if (!farms || farms.length === 0) return null;

      // Calculate basic portfolio stats
      const totalFarms = farms.length;
      const totalHectares = farms.reduce((sum, farm) => sum + (farm.total_hectares || 0), 0);
      
      const profilesComplete = farms.filter(farm => {
        // A farm is "complete" if it has essential info
        return farm.name && farm.address && farm.legal_status && 
               farm.total_hectares && farm.land_use_types && farm.department;
      }).length;
      
      const incompleteProfiles = totalFarms - profilesComplete;
      const readyForApplications = profilesComplete; // Simplified: complete profiles = ready

      // Calculate real funding metrics using eligibility service
      let totalFundingAvailable = 0;
      let totalBlockedValue = 0;
      let urgentDeadlines = 0;
      const topOpportunities: PortfolioMetrics['topOpportunities'] = [];

      // Get eligibility results for each farm
      const eligibilityPromises = farms.map(farm => 
        SubsidyEligibilityService.calculateFarmEligibility(farm.id)
      );

      try {
        const eligibilityResults = await Promise.all(eligibilityPromises);

        for (let i = 0; i < farms.length; i++) {
          const farm = farms[i];
          const result = eligibilityResults[i];

          totalFundingAvailable += result.totalReadyValue;
          totalBlockedValue += result.totalBlockedValue;

          // Check for urgent deadlines (within 30 days)
          const urgentCount = result.readyToApply.filter(subsidy => {
            if (!subsidy.deadline) return false;
            const deadline = new Date(subsidy.deadline);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            return deadline <= thirtyDaysFromNow;
          }).length;

          urgentDeadlines += urgentCount;

          // Collect top opportunities (ready to apply + high value)
          result.readyToApply
            .filter(s => s.amount && s.amount > 1000) // Only significant amounts
            .sort((a, b) => (b.amount || 0) - (a.amount || 0))
            .slice(0, 2) // Top 2 per farm
            .forEach(async (subsidy) => {
              // Get subsidy title
              const { data: subsidyData } = await supabase
                .from('subsidies')
                .select('title')
                .eq('id', subsidy.subsidyId)
                .single();

              topOpportunities.push({
                farmName: farm.name,
                subsidyTitle: String(subsidyData?.title || 'Unknown Subsidy'),
                amount: subsidy.amount || 0,
                deadline: subsidy.deadline,
                action: 'Apply Now'
              });
            });

          // Also collect blocked high-value opportunities
          result.needsAction
            .filter(s => s.amount && s.amount > 5000) // Only high-value blocked
            .sort((a, b) => (b.amount || 0) - (a.amount || 0))
            .slice(0, 1) // Top 1 blocked per farm
            .forEach(async (subsidy) => {
              const { data: subsidyData } = await supabase
                .from('subsidies')
                .select('title')
                .eq('id', subsidy.subsidyId)
                .single();

              topOpportunities.push({
                farmName: farm.name,
                subsidyTitle: String(subsidyData?.title || 'Unknown Subsidy'),
                amount: subsidy.amount || 0,
                deadline: subsidy.deadline,
                action: subsidy.requiredActions[0] || 'Complete Requirements'
              });
            });
        }
      } catch (error) {
        console.error('Error calculating eligibility:', error);
        // Fallback to basic metrics if eligibility calculation fails
      }

      // Sort top opportunities by amount (highest first)
      topOpportunities.sort((a, b) => b.amount - a.amount);

      return {
        totalFarms,
        totalHectares,
        readyForApplications,
        incompleteProfiles,
        totalFundingAvailable,
        totalBlockedValue,
        urgentDeadlines,
        topOpportunities: topOpportunities.slice(0, 5) // Top 5 across all farms
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000, // Refetch every 15 minutes
    refetchOnWindowFocus: false,
  });
};