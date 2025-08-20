
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
    <FilterSection title="Location & Eligibility">
      <div className="mb-4 min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">French Regions</h4>
        <div className="flex flex-wrap gap-2 min-w-0">
          {availableRegions.slice(0, 8).map(region => (
            <FilterTagButton
              key={region}
              value={region}
              active={regions.includes(region)}
              onClick={() => onRegionToggle(region)}
              translationKey={region}
            />
          ))}
          {availableRegions.length > 8 && (
            <span className="text-xs text-muted-foreground px-2 py-1">
              +{availableRegions.length - 8} more regions
            </span>
          )}
        </div>
      </div>
      <div className="min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">Country/Territory</h4>
        <div className="relative min-w-0">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter your country (France, EU, etc.)"
            className="pl-8 min-w-0"
            value={eligibleCountry}
            onChange={(e) => onCountryChange(e.target.value)}
          />
          {eligibleCountry && (
            <button 
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
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
