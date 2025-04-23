
import React, { ReactNode } from 'react';
import { useLanguage } from '@/contexts/language';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TranslationKey } from '@/contexts/language/types';

interface FilterSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, children, defaultOpen = true }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium mb-2">
          {title.startsWith('search.filters.') ? t(title as TranslationKey) : title}
        </h3>
        <CollapsibleTrigger asChild>
          <button className="hover:bg-gray-100 p-1 rounded-md">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="mt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default FilterSection;
