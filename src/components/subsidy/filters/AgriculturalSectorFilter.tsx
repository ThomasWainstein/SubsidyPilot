
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
      <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.farmingType')}</h4>
      <div className="flex flex-wrap">
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
          <p className="text-sm text-gray-400">No categories available</p>
        )}
      </div>
    </FilterSection>
  );
};

export default AgriculturalSectorFilter;
