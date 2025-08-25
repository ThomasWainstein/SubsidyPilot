
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculateMatchConfidence } from '@/utils/tagNormalization';
import { logger } from '@/lib/logger';

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
  title: string | null;
  description: string | null;
  region: string[] | null;
  sector: string[] | null;
  funding_type: string | null;
  deadline: string | null;
  amount: number[] | null;
  url: string | null;
  agency: string | null;
  eligibility: string | null;
  program: string | null;
  matchConfidence: number;
  created_at?: string;
  api_source?: string;
  enhanced_funding_info?: any; // Add enhanced funding info field
  // Legacy fields for backward compatibility
  categories?: string[];
  amount_min?: number;
  amount_max?: number;
}

export const useSubsidyFiltering = (farmId: string | undefined, filters: FilterState, searchQuery: string) => {
  const [subsidies, setSubsidies] = useState<SubsidyWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualityStats, setQualityStats] = useState<any>(null);

  // Fetch farm data and subsidies
  useEffect(() => {
    const fetchData = async () => {
      try {
        logger.debug('useSubsidyFiltering: Starting fetch', { farmId });
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

        // Get all subsidies from subsidies table - always fetch regardless of farm presence
        logger.debug('useSubsidyFiltering: Fetching subsidies from subsidies...');
        const { data: subsidiesData, error: subsidiesError } = await supabase
          .from('subsidies')
          .select('*')
          .order('created_at', { ascending: false });
        
        logger.debug('useSubsidyFiltering: Raw subsidies response', { subsidiesData, subsidiesError });

        if (subsidiesError) {
          console.error('Subsidies fetch error:', subsidiesError);
          setError('Failed to load subsidies');
          return;
        }

        // Calculate match confidence for each subsidy
        const subsidiesWithMatches = (subsidiesData || []).map(subsidy => {
          const farmTags = farm?.matching_tags || [];
          // For subsidies table, adapt fields from the new structure
          const farmRegion = farm?.department || farm?.country || '';
          const eligibilityCriteria = subsidy.eligibility_criteria as any;
          const subsidyRegions = eligibilityCriteria?.regions || [];
          const subsidySectors = eligibilityCriteria?.domaines || [];
          
          let matchConfidence = 0;
          if (farm) {
            // Basic region matching - check if farm region matches any subsidy region
            if (farmRegion && subsidyRegions.some((region: any) => region?.toLowerCase?.().includes(farmRegion.toLowerCase()))) {
              matchConfidence += 50;
            }
            // Check matching tags if available
            if (farmTags.length > 0 && Array.isArray(subsidy.matching_tags) && subsidy.matching_tags?.some(tag => farmTags.includes(tag))) {
              matchConfidence += 30;
            }
            // Add base confidence for having a farm profile
            matchConfidence += 20;
          }

          return {
            ...subsidy,
            // Map fields for compatibility with SubsidyWithMatch interface
            title: String(subsidy.title || ''),
            description: String(subsidy.description || ''),
            region: subsidy.region || [], // Use the actual region field from database
            sector: subsidySectors.map((d: any) => `Domain ${d}`),
            amount: subsidy.amount_min && subsidy.amount_max ? [Number(subsidy.amount_min), Number(subsidy.amount_max)] : null,
            url: String(subsidy.application_url || ''),
            agency: String(eligibilityCriteria?.organisme || ''),
            eligibility: String(eligibilityCriteria?.conditions || ''),
            program: String(subsidy.code || ''),
            api_source: subsidy.api_source,
            matchConfidence: Math.min(matchConfidence, 100)
          };
        });

        logger.debug('useSubsidyFiltering: Final subsidies with matches', { subsidiesWithMatches });
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
      filtered = filtered.filter(s => {
        const regions = Array.isArray(s.region) ? s.region : (s.region ? [s.region] : []);
        return regions.some(region => filters.regions.includes(region));
      });
    }

    // Apply country filter via eligibleCountry
    if (filters.eligibleCountry.trim()) {
      const country = filters.eligibleCountry.toLowerCase();
      filtered = filtered.filter(s => {
        const regions = Array.isArray(s.region) ? s.region : (s.region ? [s.region] : []);
        const agency = s.agency || '';
        return regions.some(region => region?.toLowerCase().includes(country)) ||
               agency.toLowerCase().includes(country) ||
               (country === 'france' && s.api_source === 'les-aides-fr');
      });
    }

    // Apply farming types filter (using sector field)
    if (filters.farmingTypes.length > 0) {
      filtered = filtered.filter(s => {
        const sectors = Array.isArray(s.sector) ? s.sector : (s.sector ? [s.sector] : []);
        return sectors.some(sector => filters.farmingTypes.includes(sector));
      });
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
        const title = s.title || '';
        const description = s.description || '';
        const agency = s.agency || '';
        
        return title.toLowerCase().includes(query) || 
               description.toLowerCase().includes(query) ||
               agency.toLowerCase().includes(query);
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
