
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
  
  // Hardcoded farmer-friendly translations to fix broken translation system
  const getDisplayText = () => {
    if (typeof translationKey === 'string') {
      const translations: Record<string, string> = {
        'search.filters.fundingInstrument.grant': 'Grants & Direct Payments',
        'search.filters.fundingInstrument.subsidy': 'Subsidies & Support',
        'search.filters.fundingInstrument.taxCredit': 'Tax Credits & Breaks',
        'search.filters.fundingInstrument.loan': 'Loans & Financing',
        'search.filters.fundingInstrument.technicalAssistance': 'Training & Support',
        'search.filters.documentsRequired.businessPlan': 'Business/Farm Plan',
        'search.filters.documentsRequired.sustainabilityReport': 'Environmental Report',
        'search.filters.documentsRequired.carbonAssessment': 'Carbon Assessment',
        'search.filters.documentsRequired.euFarmId': 'EU Farm Registration',
        'search.filters.documentsRequired.digitalCertification': 'Digital Certificates',
        'search.filters.documentsRequired.previousGrantRecord': 'Previous Funding History',
        'search.filters.sustainabilityGoals.organicTransition': 'Go Organic',
        'search.filters.sustainabilityGoals.waterEfficiency': 'Water Conservation',
        'search.filters.sustainabilityGoals.emissionReduction': 'Reduce Carbon Footprint',
        'search.filters.sustainabilityGoals.soilHealth': 'Improve Soil Health',
        'search.filters.sustainabilityGoals.biodiversity': 'Protect Wildlife & Biodiversity',
        'search.filters.sustainabilityGoals.climateAdaptation': 'Climate-Resilient Farming'
      };
      return translations[translationKey] || translationKey;
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
