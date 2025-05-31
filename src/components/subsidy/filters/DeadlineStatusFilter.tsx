
import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterCheckbox from '../FilterCheckbox';

interface DeadlineStatusFilterProps {
  deadlineStatuses: string[];
  onDeadlineStatusToggle: (status: string) => void;
}

const DeadlineStatusFilter: React.FC<DeadlineStatusFilterProps> = ({
  deadlineStatuses,
  onDeadlineStatusToggle
}) => {
  const { t } = useLanguage();

  return (
    <FilterSection title="search.filters.deadlineStatus">
      <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.deadline')}</h4>
      <div>
        {[
          { value: 'open', key: 'search.filters.deadline.open' },
          { value: 'closingSoon', key: 'search.filters.deadline.closingSoon' },
          { value: 'closed', key: 'search.filters.deadline.closed' },
        ].map(status => (
          <FilterCheckbox
            key={status.value}
            id={`deadline-status-${status.value}`}
            value={status.value}
            checked={deadlineStatuses.includes(status.value)}
            onChange={() => onDeadlineStatusToggle(status.value)}
            translationKey={status.key}
          />
        ))}
      </div>
    </FilterSection>
  );
};

export default DeadlineStatusFilter;
