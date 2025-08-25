// Advanced and Dynamic Filtering System for AgriTool
// Phase 2 Implementation: Enhanced filtering with array support, exclusions, and tooltips

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdvancedFilterState {
  // Geographic filters
  regions: string[];
  countries: string[];
  
  // Sectoral filters  
  sectors: string[];
  farmingTypes: string[];
  
  // Legal entity filters
  legalEntityTypes: string[];
  beneficiaryTypes: string[];
  
  // Funding criteria
  fundingTypes: string[];
  fundingSources: string[];
  amountRange: [number, number];
  coFinancingRate: [number, number];
  
  // Timeline filters
  deadlineStatus: string[];
  applicationWindow: 'open' | 'upcoming' | 'closed' | 'all';
  
  // Eligibility filters
  priorityGroups: string[];
  investmentTypes: string[];
  excludedActions: string[];
  
  // Quality filters
  confidenceThreshold: number;
  dataQualityScore: number;
  
  // Advanced search
  searchQuery: string;
  includeExpired: boolean;
}

export interface FilterOption {
  value: string;
  label: string;
  count: number;
  tooltip?: string;
  category?: string;
  exclusions?: string[]; // Values that exclude this option
}

export interface FilterMetadata {
  field: string;
  type: 'multiselect' | 'range' | 'single' | 'boolean';
  options: FilterOption[];
  constraints?: {
    min?: number;
    max?: number;
    excludesWith?: string[];
    requiresWith?: string[];
  };
  tooltip?: string;
  validationRules?: string[];
}

export interface SubsidyWithAdvancedMatch {
  id: string;
  title: string | null;
  description: string | null;
  region: string[] | null;
  sector: string[] | null;
  beneficiary_types: string[] | null;
  legal_entity_type: string[] | null;
  funding_type: string | null;
  funding_source: string | null;
  amount: number[] | null;
  deadline: string | null;
  agency: string | null;
  eligibility: string | null;
  excluded_actions: string[] | null;
  priority_groups: any[] | null;
  co_financing_rate: number | null;
  application_window_start: string | null;
  application_window_end: string | null;
  quality_score?: number;
  extraction_completeness?: number;
  
  // Calculated fields
  matchConfidence: number;
  eligibilityScore: number;
  exclusionReasons: string[];
  qualityFlags: string[];
}

export const useAdvancedFiltering = (farmId?: string) => {
  const [subsidies, setSubsidies] = useState<SubsidyWithAdvancedMatch[]>([]);
  const [filterMetadata, setFilterMetadata] = useState<Record<string, FilterMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmProfile, setFarmProfile] = useState<any>(null);

  // Default filter state
  const [filters, setFilters] = useState<AdvancedFilterState>({
    regions: [],
    countries: [],
    sectors: [],
    farmingTypes: [],
    legalEntityTypes: [],
    beneficiaryTypes: [],
    fundingTypes: [],
    fundingSources: [],
    amountRange: [0, 1000000],
    coFinancingRate: [0, 100],
    deadlineStatus: [],
    applicationWindow: 'all',
    priorityGroups: [],
    investmentTypes: [],
    excludedActions: [],
    confidenceThreshold: 30,
    dataQualityScore: 50,
    searchQuery: '',
    includeExpired: false
  });

  // Fetch farm profile and subsidies
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch farm profile if farmId provided
        if (farmId) {
          const { data: farm, error: farmError } = await supabase
            .from('farms')
            .select('*')
            .eq('id', farmId)
            .single();

          if (farmError) {
            console.warn('Could not fetch farm profile:', farmError);
          } else {
            setFarmProfile(farm);
          }
        }

        // Fetch all subsidies with quality metrics
        const { data: subsidyData, error: subsidyError } = await supabase
          .from('subsidies')
          .select(`
            *,
            audit
          `)
          .order('created_at', { ascending: false });

        if (subsidyError) throw subsidyError;

        // Process subsidies with advanced matching
        const processedSubsidies = (subsidyData || []).map(subsidy => 
          processSubsidyForAdvancedFiltering(subsidy, farmProfile)
        );

        setSubsidies(processedSubsidies);

        // Generate filter metadata
        const metadata = generateFilterMetadata(processedSubsidies);
        setFilterMetadata(metadata);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load subsidies');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [farmId]);

  // Apply advanced filters
  const filteredSubsidies = useMemo(() => {
    return applyAdvancedFilters(subsidies, filters, farmProfile);
  }, [subsidies, filters, farmProfile]);

  return {
    subsidies: filteredSubsidies,
    allSubsidies: subsidies,
    filters,
    setFilters,
    filterMetadata,
    loading,
    error,
    farmProfile,
    totalCount: subsidies.length,
    filteredCount: filteredSubsidies.length,
    qualityStats: calculateQualityStats(subsidies),
    filterValidation: validateCurrentFilters(filters, filterMetadata)
  };
};

/**
 * Process subsidy for advanced filtering with detailed matching
 */
function processSubsidyForAdvancedFiltering(
  subsidy: any, 
  farmProfile: any
): SubsidyWithAdvancedMatch {
  const exclusionReasons: string[] = [];
  const qualityFlags: string[] = [];
  
  // Extract quality metrics from audit field
  const audit = subsidy.audit || {};
  const qualityScore = audit.quality_score || 0;
  const extractionCompleteness = audit.extraction_completeness || 0;

  // Calculate match confidence
  let matchConfidence = 0;
  let eligibilityScore = 0;

  if (farmProfile) {
    // Region matching
    if (farmProfile.department && subsidy.region?.includes(farmProfile.department)) {
      matchConfidence += 30;
      eligibilityScore += 40;
    }

    // Sector matching
    if (farmProfile.land_use_types && subsidy.sector) {
      const sectorMatches = farmProfile.land_use_types.some((type: string) => 
        subsidy.sector.includes(type)
      );
      if (sectorMatches) {
        matchConfidence += 25;
        eligibilityScore += 30;
      }
    }

    // Legal entity matching
    if (farmProfile.legal_status && subsidy.legal_entity_type?.includes(farmProfile.legal_status)) {
      eligibilityScore += 20;
    } else if (subsidy.legal_entity_type && !subsidy.legal_entity_type.includes(farmProfile.legal_status)) {
      exclusionReasons.push(`Not eligible for legal entity type: ${farmProfile.legal_status}`);
      eligibilityScore -= 30;
    }

    // Size-based exclusions
    if (farmProfile.total_hectares && subsidy.constraints) {
      // Check for size limitations in eligibility
      const hasMaxSizeLimit = subsidy.eligibility?.toLowerCase().includes('maximum') && 
                             subsidy.eligibility?.toLowerCase().includes('hectare');
      if (hasMaxSizeLimit && farmProfile.total_hectares > 50) {
        exclusionReasons.push('Farm size may exceed program limits');
      }
    }
  }

  // Quality-based flags
  if (qualityScore < 70) qualityFlags.push('Low data quality');
  if (extractionCompleteness < 60) qualityFlags.push('Incomplete data');
  if (!subsidy.title || subsidy.title.includes('Subsidy')) qualityFlags.push('Generic title');
  if (!subsidy.deadline) qualityFlags.push('No deadline');

  // Base confidence for data completeness
  matchConfidence += Math.min(extractionCompleteness / 2, 30);

  return {
    ...subsidy,
    matchConfidence: Math.max(0, Math.min(100, matchConfidence)),
    eligibilityScore: Math.max(0, Math.min(100, eligibilityScore)),
    exclusionReasons,
    qualityFlags,
    quality_score: qualityScore,
    extraction_completeness: extractionCompleteness
  };
}

/**
 * Apply advanced filters with complex logic
 */
function applyAdvancedFilters(
  subsidies: SubsidyWithAdvancedMatch[], 
  filters: AdvancedFilterState, 
  farmProfile: any
): SubsidyWithAdvancedMatch[] {
  return subsidies.filter(subsidy => {
    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        subsidy.title,
        subsidy.description,
        subsidy.agency,
        subsidy.eligibility
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) return false;
    }

    // Geographic filters
    if (filters.regions.length > 0) {
      const regions = Array.isArray(subsidy.region) ? subsidy.region : [];
      if (!regions.some(region => filters.regions.includes(region))) return false;
    }

    // Sectoral filters
    if (filters.sectors.length > 0) {
      const sectors = Array.isArray(subsidy.sector) ? subsidy.sector : [];
      if (!sectors.some(sector => filters.sectors.includes(sector))) return false;
    }

    // Legal entity filters
    if (filters.legalEntityTypes.length > 0) {
      const entityTypes = Array.isArray(subsidy.legal_entity_type) ? subsidy.legal_entity_type : [];
      if (!entityTypes.some(type => filters.legalEntityTypes.includes(type))) return false;
    }

    // Funding filters
    if (filters.fundingTypes.length > 0) {
      if (!subsidy.funding_type || !filters.fundingTypes.includes(subsidy.funding_type)) return false;
    }

    // Amount range filter
    if (subsidy.amount && Array.isArray(subsidy.amount) && subsidy.amount.length >= 2) {
      const [minAmount, maxAmount] = subsidy.amount;
      if (maxAmount < filters.amountRange[0] || minAmount > filters.amountRange[1]) return false;
    }

    // Deadline status filter
    if (filters.deadlineStatus.length > 0) {
      const deadlineStatus = getDeadlineStatus(subsidy.deadline);
      if (!filters.deadlineStatus.includes(deadlineStatus)) return false;
    }

    // Quality filters
    if (subsidy.quality_score && subsidy.quality_score < filters.dataQualityScore) return false;
    if (subsidy.matchConfidence < filters.confidenceThreshold) return false;

    // Exclusion filters
    if (filters.excludedActions.length > 0 && subsidy.excluded_actions) {
      const hasExcludedAction = subsidy.excluded_actions.some(action => 
        filters.excludedActions.includes(action)
      );
      if (hasExcludedAction) return false;
    }

    // Include expired filter
    if (!filters.includeExpired) {
      const deadlineStatus = getDeadlineStatus(subsidy.deadline);
      if (deadlineStatus === 'closed') return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort by match confidence, then by quality score
    if (farmProfile) {
      return b.matchConfidence - a.matchConfidence;
    }
    return (b.quality_score || 0) - (a.quality_score || 0);
  });
}

/**
 * Generate metadata for all filter options
 */
function generateFilterMetadata(subsidies: SubsidyWithAdvancedMatch[]): Record<string, FilterMetadata> {
  const metadata: Record<string, FilterMetadata> = {};

  // Regions filter
  const regionCounts = new Map<string, number>();
  subsidies.forEach(s => {
    if (Array.isArray(s.region)) {
      s.region.forEach(region => {
        regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
      });
    }
  });

  metadata.regions = {
    field: 'regions',
    type: 'multiselect',
    tooltip: 'Filter by geographic regions where subsidies are available',
    options: Array.from(regionCounts.entries()).map(([value, count]) => ({
      value,
      label: value,
      count,
      tooltip: `${count} subsidies available in ${value}`
    }))
  };

  // Similar for other fields...
  // (Implementation continues for all filter types)

  return metadata;
}

/**
 * Get deadline status
 */
function getDeadlineStatus(deadline: string | null): string {
  if (!deadline) return 'unknown';
  
  const date = new Date(deadline);
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  if (date < now) return 'closed';
  if (date <= thirtyDays) return 'closing_soon';
  return 'open';
}

/**
 * Calculate quality statistics
 */
function calculateQualityStats(subsidies: SubsidyWithAdvancedMatch[]) {
  const total = subsidies.length;
  const highQuality = subsidies.filter(s => (s.quality_score || 0) >= 80).length;
  const needsReview = subsidies.filter(s => s.qualityFlags.length > 0).length;
  const hasExclusions = subsidies.filter(s => s.exclusionReasons.length > 0).length;
  
  return {
    total,
    highQuality,
    needsReview,
    hasExclusions,
    averageQuality: subsidies.reduce((sum, s) => sum + (s.quality_score || 0), 0) / total,
    averageCompleteness: subsidies.reduce((sum, s) => sum + (s.extraction_completeness || 0), 0) / total
  };
}

/**
 * Validate current filter combination
 */
function validateCurrentFilters(filters: AdvancedFilterState, metadata: Record<string, FilterMetadata>) {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for conflicting filters
  if (filters.amountRange[0] > filters.amountRange[1]) {
    errors.push('Minimum amount cannot be greater than maximum amount');
  }

  if (filters.confidenceThreshold > 90 && filters.dataQualityScore < 70) {
    warnings.push('High confidence threshold with low quality filter may return few results');
  }

  return { warnings, errors, isValid: errors.length === 0 };
}