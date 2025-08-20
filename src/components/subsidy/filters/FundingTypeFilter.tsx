
import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterCheckbox from '../FilterCheckbox';
import FilterTagButton from '../FilterTagButton';

interface FundingTypeFilterProps {
  fundingSources: string[];
  fundingInstruments: string[];
  availableFundingTypes: string[];
  onFundingSourceToggle: (source: string) => void;
  onFundingInstrumentToggle: (instrument: string) => void;
}

const FundingTypeFilter: React.FC<FundingTypeFilterProps> = ({
  fundingSources,
  fundingInstruments,
  availableFundingTypes,
  onFundingSourceToggle,
  onFundingInstrumentToggle
}) => {
  const { t } = useLanguage();

  return (
    <FilterSection title="Funding Details">
      <div className="mb-4 min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">Type of Funding</h4>
        <div className="space-y-2">
          {availableFundingTypes.length > 0 ? 
            availableFundingTypes.map(fundingType => (
              <FilterCheckbox
                key={fundingType}
                id={`funding-source-${fundingType}`}
                value={fundingType}
                checked={fundingSources.includes(fundingType)}
                onChange={() => onFundingSourceToggle(fundingType)}
                translationKey={fundingType}
              />
            )) : 
            // Fallback to common funding types
            ['Subvention', 'Prêt', 'Crédit d\'impôt', 'Garantie', 'Aide technique'].map(fundingType => (
              <FilterCheckbox
                key={fundingType}
                id={`funding-source-${fundingType}`}
                value={fundingType}
                checked={fundingSources.includes(fundingType)}
                onChange={() => onFundingSourceToggle(fundingType)}
                translationKey={fundingType}
              />
            ))
          }
        </div>
      </div>

      <div className="min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">Application Status</h4>
        <div className="flex flex-wrap gap-2 min-w-0">
          {[
            { value: 'open', key: 'Currently Open' },
            { value: 'closing_soon', key: 'Closing Soon' },
            { value: 'recently_added', key: 'Recently Added' },
            { value: 'high_success_rate', key: 'High Success Rate' },
          ].map(instrument => (
            <FilterTagButton
              key={instrument.value}
              value={instrument.value}
              active={fundingInstruments.includes(instrument.value)}
              onClick={() => onFundingInstrumentToggle(instrument.value)}
              translationKey={instrument.key}
            />
          ))}
        </div>
      </div>
    </FilterSection>
  );
};

export default FundingTypeFilter;
