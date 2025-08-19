
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/language';
import { TranslationKey } from '@/contexts/language/types';

interface FilterCheckboxProps {
  id: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  translationKey: TranslationKey | string;
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ id, value, checked, onChange, translationKey }) => {
  const { t } = useLanguage();
  
  // Hardcoded farmer-friendly translations to fix broken translation system
  const getDisplayText = () => {
    if (typeof translationKey === 'string') {
      const translations: Record<string, string> = {
        'search.filters.applicationFormat.online': 'Online Application',
        'search.filters.applicationFormat.pdf': 'PDF Forms',
        'search.filters.applicationFormat.portal': 'Government Portal',
        'search.filters.applicationFormat.consultant': 'Through Consultant Only',
        'search.filters.sustainabilityGoals.organicTransition': 'Go Organic',
        'search.filters.sustainabilityGoals.waterEfficiency': 'Water Conservation',
        'search.filters.sustainabilityGoals.emissionReduction': 'Reduce Carbon Footprint',
        'search.filters.sustainabilityGoals.soilHealth': 'Improve Soil Health',
        'search.filters.sustainabilityGoals.biodiversity': 'Protect Wildlife & Biodiversity',
        'search.filters.sustainabilityGoals.climateAdaptation': 'Climate-Resilient Farming',
        'search.filters.deadline.open': 'Applications Open',
        'search.filters.deadline.closingSoon': 'Closing Soon (30 days)',
        'search.filters.deadline.closed': 'Closed (for reference)'
      };
      return translations[translationKey] || translationKey;
    }
    return value;
  };

  return (
    <div className="flex items-start space-x-2 mb-2 min-w-0">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5 flex-shrink-0" />
      <label 
        htmlFor={id} 
        className="text-sm font-medium leading-relaxed cursor-pointer min-w-0 break-words hyphens-auto"
        style={{ wordBreak: 'break-word' }}
        title={getDisplayText()}
      >
        {getDisplayText()}
      </label>
    </div>
  );
};

export default FilterCheckbox;
