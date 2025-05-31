
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import FilterSection from '../FilterSection';
import FilterTagButton from '../FilterTagButton';

interface GeographicEligibilityFilterProps {
  regions: string[];
  eligibleCountry: string;
  availableRegions: string[];
  onRegionToggle: (region: string) => void;
  onCountryChange: (country: string) => void;
}

const GeographicEligibilityFilter: React.FC<GeographicEligibilityFilterProps> = ({
  regions,
  eligibleCountry,
  availableRegions,
  onRegionToggle,
  onCountryChange
}) => {
  const { t } = useLanguage();

  return (
    <FilterSection title="search.filters.geographicEligibility">
      <div className="mb-4">
        <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.region')}</h4>
        <div className="flex flex-wrap">
          {availableRegions.map(region => (
            <FilterTagButton
              key={region}
              value={region}
              active={regions.includes(region)}
              onClick={() => onRegionToggle(region)}
              translationKey={region}
            />
          ))}
          {availableRegions.length === 0 && (
            <p className="text-sm text-gray-400">No regions available</p>
          )}
        </div>
      </div>
      <div>
        <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.eligibleCountry')}</h4>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('search.filters.eligibleCountry')}
            className="pl-8"
            value={eligibleCountry}
            onChange={(e) => onCountryChange(e.target.value)}
          />
          {eligibleCountry && (
            <button 
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              onClick={() => onCountryChange('')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </FilterSection>
  );
};

export default GeographicEligibilityFilter;
