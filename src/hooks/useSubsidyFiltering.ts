
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateMatchConfidence } from '@/utils/tagNormalization';

interface FilterState {
  confidenceFilter: number[];
  regions: string[];
  eligibleCountry: string;
  farmingTypes: string[];
  fundingSources: string[];
  fundingInstruments: string[];
  documentsRequired: string[];
  applicationFormats: string[];
  sustainabilityGoals: string[];
  deadlineStatuses: string[];
}

interface SubsidyWithMatch {
  id: string;
  title: any;
  description: any;
  region: string[];
  categories: string[];
  funding_type: string;
  deadline: string;
  amount_min: number;
  amount_max: number;
  matching_tags: string[];
  matchConfidence: number;
  created_at?: string;
}

export const useSubsidyFiltering = (farmId: string | undefined, filters: FilterState, searchQuery: string) => {
  const [subsidies, setSubsidies] = useState<SubsidyWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch farm data and subsidies
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('useSubsidyFiltering: Starting fetch, farmId:', farmId);
        setLoading(true);
        setError(null);

        let farm = null;
        
        // Get farm data for matching only if farmId is provided
        if (farmId) {
          const { data: farmData, error: farmError } = await supabase
            .from('farms')
            .select('*')
            .eq('id', farmId)
            .single();

          if (farmError) {
            console.error('Farm fetch error:', farmError);
            // Don't return error for farm not found - just proceed without farm matching
            console.warn('Proceeding without farm data for matching');
          } else {
            farm = farmData;
          }
        }

        // Get all subsidies - always fetch regardless of farm presence
        console.log('useSubsidyFiltering: Fetching subsidies from database...');
        const { data: subsidiesData, error: subsidiesError } = await supabase
          .from('subsidies')
          .select('*')
          .order('created_at', { ascending: false });
        
        console.log('useSubsidyFiltering: Raw subsidies response:', { subsidiesData, subsidiesError });

        if (subsidiesError) {
          console.error('Subsidies fetch error:', subsidiesError);
          setError('Failed to load subsidies');
          return;
        }

        // Calculate match confidence for each subsidy
        const subsidiesWithMatches = (subsidiesData || []).map(subsidy => {
          const farmTags = farm?.matching_tags || [];
          const subsidyTags = subsidy.matching_tags || [];
          // If no farm, default to 0% match confidence (no farm-specific matching)
          const matchConfidence = farm ? calculateMatchConfidence(farmTags, subsidyTags) : 0;

          return {
            ...subsidy,
            matchConfidence
          };
        });

        console.log('useSubsidyFiltering: Final subsidies with matches:', subsidiesWithMatches);
        setSubsidies(subsidiesWithMatches);
      } catch (err) {
        console.error('Data fetch error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    // Always fetch data, regardless of farmId presence
    fetchData();
  }, [farmId]);

  // Apply filters and search
  const filteredSubsidies = useMemo(() => {
    let filtered = [...subsidies];

    // Apply confidence filter only if we have farm context (farmId exists)
    if (filters.confidenceFilter.length > 0 && farmId) {
      const minConfidence = filters.confidenceFilter[0];
      filtered = filtered.filter(s => s.matchConfidence >= minConfidence);
    }

    // Apply region filter
    if (filters.regions.length > 0) {
      filtered = filtered.filter(s => 
        s.region && s.region.some(r => filters.regions.includes(r))
      );
    }

    // Apply farming types filter
    if (filters.farmingTypes.length > 0) {
      filtered = filtered.filter(s => 
        s.categories && s.categories.some(c => filters.farmingTypes.includes(c))
      );
    }

    // Apply funding sources filter
    if (filters.fundingSources.length > 0) {
      filtered = filtered.filter(s => 
        s.funding_type && filters.fundingSources.includes(s.funding_type)
      );
    }

    // Apply deadline status filter
    if (filters.deadlineStatuses.length > 0) {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      filtered = filtered.filter(s => {
        if (!s.deadline) return false;
        
        const deadline = new Date(s.deadline);
        
        return filters.deadlineStatuses.some(status => {
          switch (status) {
            case 'open':
              return deadline >= today;
            case 'closingSoon':
              return deadline >= today && deadline <= thirtyDaysFromNow;
            case 'closed':
              return deadline < today;
            default:
              return true;
          }
        });
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const title = typeof s.title === 'object' ? 
          (s.title.en || s.title.ro || s.title.fr || Object.values(s.title)[0] || '') : 
          (s.title || '');
        const description = typeof s.description === 'object' ? 
          (s.description.en || s.description.ro || s.description.fr || Object.values(s.description)[0] || '') : 
          (s.description || '');
        
        return title.toLowerCase().includes(query) || 
               description.toLowerCase().includes(query);
      });
    }

    // Sort by match confidence if farm context exists, otherwise sort by creation date
    if (farmId) {
      return filtered.sort((a, b) => b.matchConfidence - a.matchConfidence);
    } else {
      return filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
  }, [subsidies, filters, searchQuery, farmId]);

  return {
    subsidies: filteredSubsidies,
    loading,
    error,
    totalCount: subsidies.length,
    filteredCount: filteredSubsidies.length
  };
};
