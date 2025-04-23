
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/language';

interface FilterCheckboxProps {
  id: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  translationKey: string;
}

const FilterCheckbox: React.FC<FilterCheckboxProps> = ({ id, value, checked, onChange, translationKey }) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center space-x-2 mb-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      <label 
        htmlFor={id} 
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {t(translationKey)}
      </label>
    </div>
  );
};

export default FilterCheckbox;
