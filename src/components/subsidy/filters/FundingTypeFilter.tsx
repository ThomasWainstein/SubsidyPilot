
import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterCheckbox from '../FilterCheckbox';
import FilterTagButton from '../FilterTagButton';
import { formatFilterLabel } from '@/utils/subsidyFormatting';

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
    <FilterSection title="search.filters.fundingType">
      <div className="mb-4 min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">{t('search.filters.fundingSource')}</h4>
        <div className="space-y-2">
          {availableFundingTypes.map(fundingType => (
            <FilterCheckbox
              key={fundingType}
              id={`funding-source-${fundingType}`}
              value={fundingType}
              checked={fundingSources.includes(fundingType)}
              onChange={() => onFundingSourceToggle(fundingType)}
              translationKey={formatFilterLabel(fundingType, t)}
            />
          ))}
          {availableFundingTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">No funding types available</p>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">{t('search.filters.fundingInstrument')}</h4>
        <div className="flex flex-wrap gap-2 min-w-0">
          {[
            { value: 'grant', key: 'search.filters.fundingInstrument.grant' },
            { value: 'subsidy', key: 'search.filters.fundingInstrument.subsidy' },
            { value: 'taxCredit', key: 'search.filters.fundingInstrument.taxCredit' },
            { value: 'loan', key: 'search.filters.fundingInstrument.loan' },
            { value: 'technicalAssistance', key: 'search.filters.fundingInstrument.technicalAssistance' },
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
