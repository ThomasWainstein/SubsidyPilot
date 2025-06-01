
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Subsidy = Database['public']['Tables']['subsidies']['Row'];
type SubsidyInsert = Database['public']['Tables']['subsidies']['Insert'];

export interface SubsidyFilters {
  region?: string[];
  categories?: string[];
  fundingType?: string;
  status?: string;
  deadline?: 'active' | 'upcoming' | 'expired';
  amountMin?: number;
  amountMax?: number;
  searchTerm?: string;
}

export const useSubsidies = (filters?: SubsidyFilters) => {
  return useQuery({
    queryKey: ['subsidies', filters],
    queryFn: async () => {
      let query = supabase
        .from('subsidies')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.region && filters.region.length > 0) {
        query = query.overlaps('region', filters.region);
      }

      if (filters?.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories);
      }

      if (filters?.fundingType) {
        query = query.eq('funding_type', filters.fundingType);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.amountMin) {
        query = query.gte('amount_min', filters.amountMin);
      }

      if (filters?.amountMax) {
        query = query.lte('amount_max', filters.amountMax);
      }

      // Handle deadline filter
      if (filters?.deadline) {
        const today = new Date().toISOString().split('T')[0];
        const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        switch (filters.deadline) {
          case 'active':
            query = query.gte('deadline', today);
            break;
          case 'upcoming':
            query = query.gte('deadline', today).lte('deadline', oneMonthFromNow);
            break;
          case 'expired':
            query = query.lt('deadline', today);
            break;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Subsidy[];
    },
  });
};

export const useSubsidy = (subsidyId: string) => {
  return useQuery({
    queryKey: ['subsidy', subsidyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidies')
        .select('*')
        .eq('id', subsidyId)
        .single();

      if (error) throw error;
      return data as Subsidy;
    },
    enabled: !!subsidyId,
  });
};

export const useMatchingSubsidies = (farmId: string) => {
  return useQuery({
    queryKey: ['matching-subsidies', farmId],
    queryFn: async () => {
      // First get the farm data
      const { data: farm, error: farmError } = await supabase
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .single();

      if (farmError) throw farmError;

      // Get all subsidies
      const { data: subsidies, error: subsidiesError } = await supabase
        .from('subsidies')
        .select('*');

      if (subsidiesError) throw subsidiesError;

      // Calculate match confidence for each subsidy
      const subsidiesWithConfidence = await Promise.all(
        subsidies.map(async (subsidy) => {
          const { data: confidence } = await supabase.rpc('calculate_match_confidence', {
            farm_tags: farm.matching_tags || [],
            subsidy_tags: subsidy.matching_tags || [],
            farm_region: farm.department || '',
            subsidy_regions: subsidy.region || [],
          });

          return {
            ...subsidy,
            matchConfidence: confidence || 0,
          };
        })
      );

      // Sort by match confidence and return top matches
      return subsidiesWithConfidence
        .filter(s => s.matchConfidence > 30) // Only show subsidies with >30% match
        .sort((a, b) => b.matchConfidence - a.matchConfidence);
    },
    enabled: !!farmId,
  });
};

export const useCreateSubsidy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subsidyData: SubsidyInsert) => {
      const { data, error } = await supabase
        .from('subsidies')
        .insert(subsidyData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subsidies'] });
      toast({
        title: 'Success',
        description: 'Subsidy created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: `Failed to create subsidy: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};
