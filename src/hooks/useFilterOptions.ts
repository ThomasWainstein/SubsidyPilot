
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  regions: string[];
  organizations: string[];
  categories: string[];
  fundingTypes: string[];
  amountRanges: { label: string; min: number; max: number }[];
  sectors: string[];
  loading: boolean;
  error: string | null;
}

export const useFilterOptions = (): FilterOptions => {
  const [options, setOptions] = useState<FilterOptions>({
    regions: [],
    organizations: [],
    categories: [],
    fundingTypes: [],
    amountRanges: [],
    sectors: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Get data from main subsidies table (has real data)
        const { data: subsidies, error: subsidiesError } = await supabase
          .from('subsidies')
          .select('title, eligibility_criteria, amount_min, amount_max, raw_data');

        if (subsidiesError) {
          throw subsidiesError;
        }

        // Extract unique values from real data
        const regionsSet = new Set<string>();
        const organizationsSet = new Set<string>();
        const categoriesSet = new Set<string>();  
        const sectorsSet = new Set<string>();
        const fundingTypesSet = new Set<string>();
        const amounts: number[] = [];

        subsidies?.forEach(subsidy => {
          // Extract organizations from eligibility_criteria
          const eligibilityCriteria = subsidy.eligibility_criteria as any;
          const organization = eligibilityCriteria?.organisme;
          if (organization && typeof organization === 'string') {
            organizationsSet.add(organization);
          }

          // Extract regions from raw_data or eligibility_criteria
          const rawData = subsidy.raw_data as any;
          const shortName = rawData?.fiche?.sigle;
          if (shortName && typeof shortName === 'string') {
            // Extract region from organization names
            if (shortName.includes('Région')) {
              regionsSet.add(shortName);
            }
          }

          // Extract categories from titles
          const title = subsidy.title;
          if (typeof title === 'string') {
            // Categorize based on common keywords in titles
            if (title.toLowerCase().includes('agricol') || title.toLowerCase().includes('bio')) {
              sectorsSet.add('Agriculture & Bio');
            }
            if (title.toLowerCase().includes('innovation') || title.toLowerCase().includes('r&d')) {
              sectorsSet.add('Innovation & R&D');
            }
            if (title.toLowerCase().includes('export') || title.toLowerCase().includes('commercial')) {
              sectorsSet.add('Export & Commerce');
            }
            if (title.toLowerCase().includes('solaire') || title.toLowerCase().includes('énergétique')) {
              sectorsSet.add('Énergie & Environnement');
            }
            if (title.toLowerCase().includes('création') || title.toLowerCase().includes('reprise')) {
              sectorsSet.add('Création d\'entreprise');
            }
            if (title.toLowerCase().includes('prêt') || title.toLowerCase().includes('financement')) {
              fundingTypesSet.add('Prêt');
            }
            if (title.toLowerCase().includes('aide') || title.toLowerCase().includes('subvention')) {
              fundingTypesSet.add('Subvention');
            }
            if (title.toLowerCase().includes('diagnostic') || title.toLowerCase().includes('conseil')) {
              sectorsSet.add('Conseil & Accompagnement');
            }
          }

          // Collect amount data for ranges
          if (subsidy.amount_min !== null) amounts.push(subsidy.amount_min);
          if (subsidy.amount_max !== null) amounts.push(subsidy.amount_max);
        });

        // Add major French regions if not already present
        const majorRegions = [
          'Nouvelle-Aquitaine',
          'Occitanie', 
          'Auvergne-Rhône-Alpes',
          'Grand-Est',
          'Provence-Alpes-Côte d\'Azur',
          'Hauts-de-France',
          'Bretagne',
          'Normandie',
          'Pays de la Loire',
          'Centre-Val de Loire',
          'Bourgogne-Franche-Comté',
          'Île-de-France'
        ];
        
        majorRegions.forEach(region => regionsSet.add(region));

        // Create amount ranges based on real data
        const sortedAmounts = amounts.sort((a, b) => a - b);
        const amountRanges = [
          { label: 'Moins de 10 000 €', min: 0, max: 10000 },
          { label: '10 000 € - 50 000 €', min: 10000, max: 50000 },
          { label: '50 000 € - 100 000 €', min: 50000, max: 100000 },
          { label: '100 000 € - 500 000 €', min: 100000, max: 500000 },
          { label: 'Plus de 500 000 €', min: 500000, max: Infinity }
        ];

        // Add default funding types if none found
        if (fundingTypesSet.size === 0) {
          fundingTypesSet.add('Subvention');
          fundingTypesSet.add('Prêt');
          fundingTypesSet.add('Crédit d\'impôt');
          fundingTypesSet.add('Garantie');
        }

        setOptions({
          regions: Array.from(regionsSet).sort(),
          organizations: Array.from(organizationsSet).sort(),
          categories: Array.from(categoriesSet).sort(),
          sectors: Array.from(sectorsSet).sort(),
          fundingTypes: Array.from(fundingTypesSet).sort(),
          amountRanges,
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
