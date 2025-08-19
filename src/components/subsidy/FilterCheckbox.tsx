
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
  
  // Get the display text - handle translation keys properly
  const getDisplayText = () => {
    if (typeof translationKey === 'string') {
      if (translationKey.startsWith('search.filters.')) {
        return t(translationKey as TranslationKey);
      }
      return translationKey;
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
