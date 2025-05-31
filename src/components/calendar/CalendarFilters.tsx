
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';

interface CalendarFiltersProps {
  uniqueSubsidyPrograms: string[];
  uniqueRegulationTypes: string[];
  eventTypeColors: Record<string, string>;
}

const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  uniqueSubsidyPrograms,
  uniqueRegulationTypes,
  eventTypeColors,
}) => {
  const { t } = useLanguage();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar Filters</h3>
            <p className="text-gray-600 text-sm">
              Calendar functionality will be available in a future update.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarFilters;
