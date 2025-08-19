
import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterTagButton from '../FilterTagButton';

interface AgriculturalSectorFilterProps {
  farmingTypes: string[];
  availableCategories: string[];
  onFarmingTypeToggle: (type: string) => void;
}

const AgriculturalSectorFilter: React.FC<AgriculturalSectorFilterProps> = ({
  farmingTypes,
  availableCategories,
  onFarmingTypeToggle
}) => {
  const { t } = useLanguage();

  return (
    <FilterSection title="search.filters.agriculturalSector">
      <h4 className="text-xs text-muted-foreground mb-2 font-medium">What You Grow/Raise</h4>
      <div className="flex flex-wrap gap-2 min-w-0">
        {availableCategories.map(category => (
          <FilterTagButton
            key={category}
            value={category}
            active={farmingTypes.includes(category)}
            onClick={() => onFarmingTypeToggle(category)}
            translationKey={category}
          />
        ))}
        {availableCategories.length === 0 && (
          <p className="text-sm text-muted-foreground">No farm types available</p>
        )}
      </div>
    </FilterSection>
  );
};

export default AgriculturalSectorFilter;
