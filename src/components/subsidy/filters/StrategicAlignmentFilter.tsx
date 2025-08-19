
import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterCheckbox from '../FilterCheckbox';

interface StrategicAlignmentFilterProps {
  sustainabilityGoals: string[];
  onSustainabilityGoalToggle: (goal: string) => void;
}

const StrategicAlignmentFilter: React.FC<StrategicAlignmentFilterProps> = ({
  sustainabilityGoals,
  onSustainabilityGoalToggle
}) => {
  const { t } = useLanguage();

  return (
    <FilterSection title="search.filters.strategicAlignment">
      <h4 className="text-xs text-muted-foreground mb-2 font-medium">{t('search.filters.sustainabilityGoals')}</h4>
      <div className="space-y-2 min-w-0">
        {[
          { value: 'organicTransition', key: 'search.filters.sustainabilityGoals.organicTransition' },
          { value: 'waterEfficiency', key: 'search.filters.sustainabilityGoals.waterEfficiency' },
          { value: 'emissionReduction', key: 'search.filters.sustainabilityGoals.emissionReduction' },
          { value: 'soilHealth', key: 'search.filters.sustainabilityGoals.soilHealth' },
          { value: 'biodiversity', key: 'search.filters.sustainabilityGoals.biodiversity' },
          { value: 'climateAdaptation', key: 'search.filters.sustainabilityGoals.climateAdaptation' },
        ].map(goal => (
          <FilterCheckbox
            key={goal.value}
            id={`sustainability-goal-${goal.value}`}
            value={goal.value}
            checked={sustainabilityGoals.includes(goal.value)}
            onChange={() => onSustainabilityGoalToggle(goal.value)}
            translationKey={goal.key}
          />
        ))}
      </div>
    </FilterSection>
  );
};

export default StrategicAlignmentFilter;
