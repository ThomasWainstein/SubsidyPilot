
import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language';
import { X } from 'lucide-react';

interface FilterTagButtonProps {
  value: string;
  active: boolean;
  onClick: () => void;
  translationKey: string;
}

const FilterTagButton: React.FC<FilterTagButtonProps> = ({ value, active, onClick, translationKey }) => {
  const { t } = useLanguage();

  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className={`mb-2 mr-2 ${active ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-300' : ''}`}
      onClick={onClick}
    >
      {t(translationKey)}
      {active && <X className="ml-1 h-3 w-3" />}
    </Button>
  );
};

export default FilterTagButton;
