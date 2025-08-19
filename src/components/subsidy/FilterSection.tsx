
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

  // Hardcoded farmer-friendly translations to fix broken translation system
  const getTitle = (key: string) => {
    const titles: Record<string, string> = {
      'search.filters.geographicEligibility': 'Location & Eligibility',
      'search.filters.agriculturalSector': 'Farm Type & Crops',
      'search.filters.fundingType': 'Funding Options',
      'search.filters.applicationRequirements': 'Application Requirements',
      'search.filters.strategicAlignment': 'Farm Goals & Sustainability',
      'search.filters.deadlineStatus': 'Application Timeline'
    };
    return titles[key] || title;
  };

  return (
    <div className="mb-6 min-w-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between py-2 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate flex-1">
            {title.startsWith('search.filters.') ? getTitle(title) : title}
          </h4>
          <CollapsibleTrigger asChild>
            <button className="hover:bg-accent p-1 rounded-md transition-colors flex-shrink-0 ml-2">
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="pt-2 space-y-3 min-w-0">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default FilterSection;
