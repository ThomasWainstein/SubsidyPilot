
import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language';
import { X } from 'lucide-react';
import { TranslationKey } from '@/contexts/language/types';

interface FilterTagButtonProps {
  value: string;
  active: boolean;
  onClick: () => void;
  translationKey: TranslationKey | string;
}

const FilterTagButton: React.FC<FilterTagButtonProps> = ({ value, active, onClick, translationKey }) => {
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
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={`mb-2 mr-2 min-w-0 max-w-full text-left justify-start h-auto py-1.5 px-3 ${
        active 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
          : 'hover:bg-accent hover:text-accent-foreground'
      }`}
      onClick={onClick}
    >
      <span className="truncate block max-w-[160px]" title={getDisplayText()}>
        {getDisplayText()}
      </span>
      {active && <X className="ml-1 h-3 w-3 flex-shrink-0" />}
    </Button>
  );
};

export default FilterTagButton;
