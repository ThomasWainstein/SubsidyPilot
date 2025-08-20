
import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterTagButton from '../FilterTagButton';

interface AgriculturalSectorFilterProps {
  farmingTypes: string[];
  availableCategories: string[];
  availableSectors?: string[];
  onFarmingTypeToggle: (type: string) => void;
}

const AgriculturalSectorFilter: React.FC<AgriculturalSectorFilterProps> = ({
  farmingTypes,
  availableCategories,
  availableSectors = [],
  onFarmingTypeToggle
}) => {
  const { t } = useLanguage();

  // Use sectors from real data, fallback to categories
  const sectorsToShow = availableSectors.length > 0 ? availableSectors : availableCategories;

  return (
    <FilterSection title="Business & Sector">
      <h4 className="text-xs text-muted-foreground mb-2 font-medium">Activity Sector</h4>
      <div className="flex flex-wrap gap-2 min-w-0">
        {sectorsToShow.map(sector => (
          <FilterTagButton
            key={sector}
            value={sector}
            active={farmingTypes.includes(sector)}
            onClick={() => onFarmingTypeToggle(sector)}
            translationKey={sector}
          />
        ))}
        {sectorsToShow.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {/* Fallback to common business sectors */}
            {['Agriculture', 'Technology', 'Manufacturing', 'Services', 'Export'].map(sector => (
              <FilterTagButton
                key={sector}
                value={sector}
                active={farmingTypes.includes(sector)}
                onClick={() => onFarmingTypeToggle(sector)}
                translationKey={sector}
              />
            ))}
          </div>
        )}
      </div>
    </FilterSection>
  );
};

export default AgriculturalSectorFilter;
