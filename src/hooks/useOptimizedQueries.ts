/**
 * Database Query Optimization Utilities
 * Provides hooks and utilities for optimized database queries
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useMemo } from 'react';

// 🚀 PERFORMANCE: Query key factory for consistent caching
export const queryKeys = {
  farms: (userId?: string) => ['farms', userId],
  farm: (farmId: string) => ['farm', farmId],
  subsidies: (filters?: Record<string, any>) => ['subsidies', filters],
  subsidy: (subsidyId: string) => ['subsidy', subsidyId],
  documents: (farmId: string, filters?: Record<string, any>) => ['documents', farmId, filters],
  document: (documentId: string) => ['document', documentId],
  extractions: (documentId: string) => ['extractions', documentId],
  applications: (farmId?: string) => ['applications', farmId],
  userProfile: (userId: string) => ['userProfile', userId],
  adminData: () => ['adminData'],
} as const;

// 🚀 PERFORMANCE: Optimized farm queries with selective fields
export const useFarmsOptimized = (userId?: string) => {
  return useQuery({
    queryKey: queryKeys.farms(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farms')
        .select(`
          id,
          name,
          address,
          total_hectares,
          department,
          country,
          created_at,
          updated_at
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in v5)
  });
};

// 🚀 PERFORMANCE: Optimized subsidies query with pagination
export const useSubsidiesOptimized = (
  page = 0,
  pageSize = 20,
  filters?: Record<string, any>
) => {
  const queryKey = useMemo(() => 
    queryKeys.subsidies({ page, pageSize, ...filters }), 
    [page, pageSize, filters]
  );

  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('subsidies')
        .select(`
          id,
          code,
          title,
          description,
          agency,
          deadline,
          funding_type,
          status,
          region,
          tags,
          created_at
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters
      if (filters?.agency) {
        query = query.eq('agency', filters.agency);
      }
      if (filters?.region) {
        query = query.contains('region', [filters.region]);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`title->>'fr'.ilike.%${filters.search}%,description->>'fr'.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { data, count, page, pageSize };
    },
    staleTime: 3 * 60 * 1000, // 3 minutes for subsidies
    placeholderData: (previousData) => previousData, // Keep previous data while loading (v5 syntax)
  });
};

// 🚀 PERFORMANCE: Optimized document extractions with minimal data
export const useDocumentExtractionsOptimized = (documentId: string) => {
  return useQuery({
    queryKey: queryKeys.extractions(documentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_extractions')
        .select(`
          id,
          confidence_score,
          status,
          extraction_type,
          created_at,
          extracted_data
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000, // 10 minutes - extraction results don't change often
  });
};

// 🚀 PERFORMANCE: Bulk update hook for batch operations
export const useBulkUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ table, updates }: { 
      table: 'farms' | 'subsidies' | 'applications' | 'farm_documents'; 
      updates: Array<{ id: string; data: Record<string, any> }> 
    }) => {
      // Perform bulk operations using batch updates
      const results = [];
      for (const update of updates) {
        if (table === 'farms') {
          const { data, error } = await supabase
            .from('farms')
            .update(update.data)
            .eq('id', update.id);
          if (error) throw error;
          results.push(data);
        } else if (table === 'subsidies') {
          const { data, error } = await supabase
            .from('subsidies')
            .update(update.data)
            .eq('id', update.id);
          if (error) throw error;
          results.push(data);
        }
        // Add other table cases as needed
      }
      return results;
    },
    onSuccess: (_, { table }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [table] });
    },
  });
};

// 🚀 PERFORMANCE: Optimized query for large datasets with pagination
export const useSubsidiesPaginated = (filters?: Record<string, any>, pageSize = 50) => {
  return useQuery({
    queryKey: ['paginated-subsidies', filters],
    queryFn: async () => {
      let query = supabase
        .from('subsidies')
        .select(`
          id,
          code,
          title,
          agency,
          deadline,
          status
        `)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (filters?.search) {
        query = query.or(`title->>'fr'.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        data,
        hasMore: data.length === pageSize,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

// 🚀 PERFORMANCE: Query prefetching utilities
export const usePrefetchQueries = () => {
  const queryClient = useQueryClient();

  const prefetchSubsidies = useCallback((filters?: Record<string, any>) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.subsidies(filters),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('subsidies')
          .select('id, title, agency, deadline')
          .limit(20);
        
        if (error) throw error;
        return data;
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient]);

  const prefetchFarmDetails = useCallback((farmId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.farm(farmId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .eq('id', farmId)
          .single();
        
        if (error) throw error;
        return data;
      },
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetchSubsidies, prefetchFarmDetails };
};

// 🚀 PERFORMANCE: Smart cache management
export const useCacheManager = () => {
  const queryClient = useQueryClient();

  const clearStaleCache = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => {
        return (Date.now() - (query.state.dataUpdatedAt || 0)) > 30 * 60 * 1000; // 30 minutes
      }
    });
  }, [queryClient]);

  const optimizeCache = useCallback(() => {
    // Remove unused queries to free memory
    queryClient.getQueryCache().clear();
    // Keep only essential queries cached
    const essentialQueries = ['farms', 'userProfile'];
    queryClient.invalidateQueries({
      predicate: (query) => {
        return !essentialQueries.some(key => query.queryKey[0] === key);
      }
    });
  }, [queryClient]);

  return { clearStaleCache, optimizeCache };
};
