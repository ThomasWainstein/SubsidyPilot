
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { useCalendar } from '@/contexts/CalendarContext';
import { farms } from '@/data/farms';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
  const { filters, setFilters, selectedFarms, setSelectedFarms, view, setView } = useCalendar();

  const toggleFarmSelection = (farmId: string) => {
    if (selectedFarms.includes(farmId)) {
      setSelectedFarms(selectedFarms.filter(id => id !== farmId));
    } else {
      setSelectedFarms([...selectedFarms, farmId]);
    }
  };

  const toggleSubsidyProgramFilter = (program: string) => {
    const currentPrograms = filters.subsidyProgram;
    if (currentPrograms.includes(program)) {
      setFilters({
        ...filters,
        subsidyProgram: currentPrograms.filter(p => p !== program)
      });
    } else {
      setFilters({
        ...filters,
        subsidyProgram: [...currentPrograms, program]
      });
    }
  };

  const toggleRegulationTypeFilter = (type: string) => {
    const currentTypes = filters.regulationType;
    if (currentTypes.includes(type)) {
      setFilters({
        ...filters,
        regulationType: currentTypes.filter(t => t !== type)
      });
    } else {
      setFilters({
        ...filters,
        regulationType: [...currentTypes, type]
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-sm mb-2">{t('calendar.view')}</h3>
            <Tabs value={view} onValueChange={(v: 'month' | 'week') => setView(v)}>
              <TabsList className="w-full">
                <TabsTrigger value="month" className="flex-1">{t('calendar.month')}</TabsTrigger>
                <TabsTrigger value="week" className="flex-1">{t('calendar.week')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div>
            <h3 className="font-medium text-sm mb-2">{t('calendar.farms')}</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {farms.map((farm) => (
                <div key={farm.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`farm-${farm.id}`}
                    checked={selectedFarms.includes(farm.id)}
                    onCheckedChange={() => toggleFarmSelection(farm.id)}
                  />
                  <Label 
                    htmlFor={`farm-${farm.id}`}
                    className="text-sm cursor-pointer"
                  >
                    {farm.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-sm mb-2">{t('calendar.subsidyPrograms')}</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {uniqueSubsidyPrograms.map((program) => (
                <div key={program} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`program-${program}`}
                    checked={filters.subsidyProgram.includes(program)}
                    onCheckedChange={() => toggleSubsidyProgramFilter(program)}
                  />
                  <Label 
                    htmlFor={`program-${program}`}
                    className="text-sm cursor-pointer"
                  >
                    {program}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-sm mb-2">{t('calendar.regulationTypes')}</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {uniqueRegulationTypes.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`type-${type}`}
                    checked={filters.regulationType.includes(type)}
                    onCheckedChange={() => toggleRegulationTypeFilter(type)}
                  />
                  <Label 
                    htmlFor={`type-${type}`}
                    className="text-sm cursor-pointer"
                  >
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium text-sm mb-2">{t('calendar.eventTypes')}</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventTypeColors).map(([type, color]) => (
                <div key={type} className="flex items-center">
                  <span 
                    className="inline-block w-3 h-3 mr-1 rounded-full" 
                    style={{ backgroundColor: color }}
                  ></span>
                  <span className="text-xs capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarFilters;
