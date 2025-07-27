
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  regions: string[];
  categories: string[];
  fundingTypes: string[];
  loading: boolean;
  error: string | null;
}

export const useFilterOptions = (): FilterOptions => {
  const [options, setOptions] = useState<FilterOptions>({
    regions: [],
    categories: [],
    fundingTypes: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Get unique regions from subsidies_structured
        const { data: subsidies, error: subsidiesError } = await supabase
          .from('subsidies_structured')
          .select('region, sector, funding_type');

        if (subsidiesError) {
          throw subsidiesError;
        }

        // Extract unique values
        const regionsSet = new Set<string>();
        const categoriesSet = new Set<string>();
        const fundingTypesSet = new Set<string>();

        subsidies?.forEach(subsidy => {
          // Add regions - handle both string and array formats
          if (subsidy.region) {
            if (Array.isArray(subsidy.region)) {
              subsidy.region.forEach(r => regionsSet.add(r));
            } else if (typeof subsidy.region === 'string') {
              regionsSet.add(subsidy.region);
            }
          }

          // Add sectors (changed from categories to sector) - handle array format
          if (subsidy.sector) {
            if (Array.isArray(subsidy.sector)) {
              subsidy.sector.forEach(s => categoriesSet.add(s));
            } else if (typeof subsidy.sector === 'string') {
              categoriesSet.add(subsidy.sector);
            }
          }

          // Add funding types
          if (subsidy.funding_type) {
            fundingTypesSet.add(subsidy.funding_type);
          }
        });

        setOptions({
          regions: Array.from(regionsSet).sort(),
          categories: Array.from(categoriesSet).sort(),
          fundingTypes: Array.from(fundingTypesSet).sort(),
          loading: false,
          error: null
        });
      } catch (err) {
        console.error('Error fetching filter options:', err);
        setOptions(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load filter options'
        }));
      }
    };

    fetchFilterOptions();
  }, []);

  return options;
};
