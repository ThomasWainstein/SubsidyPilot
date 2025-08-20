import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterCheckbox from '../FilterCheckbox';

interface AmountRange {
  label: string;
  min: number;
  max: number;
}

interface AmountRangeFilterProps {
  selectedRanges: string[];
  availableRanges: AmountRange[];
  onRangeToggle: (rangeLabel: string) => void;
}

const AmountRangeFilter: React.FC<AmountRangeFilterProps> = ({
  selectedRanges,
  availableRanges,
  onRangeToggle
}) => {
  const { t } = useLanguage();

  return (
    <FilterSection title="Funding Amount">
      <h4 className="text-xs text-muted-foreground mb-2 font-medium">Expected Amount Range</h4>
      <div className="space-y-2">
        {availableRanges.map(range => (
          <FilterCheckbox
            key={range.label}
            id={`amount-range-${range.label}`}
            value={range.label}
            checked={selectedRanges.includes(range.label)}
            onChange={() => onRangeToggle(range.label)}
            translationKey={range.label}
          />
        ))}
        {availableRanges.length === 0 && (
          <div className="space-y-2">
            {/* Fallback ranges */}
            {[
              'Less than €10,000',
              '€10,000 - €50,000',
              '€50,000 - €100,000',
              '€100,000 - €500,000',
              'More than €500,000'
            ].map(range => (
              <FilterCheckbox
                key={range}
                id={`amount-range-${range}`}
                value={range}
                checked={selectedRanges.includes(range)}
                onChange={() => onRangeToggle(range)}
                translationKey={range}
              />
            ))}
          </div>
        )}
      </div>
    </FilterSection>
  );
};

export default AmountRangeFilter;