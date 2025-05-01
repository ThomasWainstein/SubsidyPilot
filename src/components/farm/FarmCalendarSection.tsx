
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateFarmEvents } from '@/utils/mockCalendarData';
import { CalendarEvent, EventType } from '@/types/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FarmCalendarDisplay from './FarmCalendarDisplay';
import FarmEventDetailsSidebar from './FarmEventDetailsSidebar';
import FarmCalendarInfoBanner from './FarmCalendarInfoBanner';

const eventTypeColors: Record<EventType, string> = {
  funding: '#1EAEDB', // Bright Blue
  compliance: '#ea384c', // Red
  document: '#9b87f5', // Purple
  task: '#F97316', // Orange
  regulatory: '#FFDEE2', // Soft Pink
};

interface FarmCalendarSectionProps {
  farmId: string;
  farmName: string;
}

const FarmCalendarSection: React.FC<FarmCalendarSectionProps> = ({ farmId }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    // Load mock events for this specific farm
    setEvents(generateFarmEvents(farmId, 8));
  }, [farmId]);

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const closeEventDetails = () => {
    setSelectedEvent(null);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t('calendar.farmCalendar')}</CardTitle>
          <Tabs value={view} onValueChange={(v: 'month' | 'agenda') => setView(v)}>
            <TabsList>
              <TabsTrigger value="month">{t('calendar.month')}</TabsTrigger>
              <TabsTrigger value="agenda">{t('calendar.agenda')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <FarmCalendarInfoBanner />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${selectedEvent ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-gray-800 rounded-lg p-0 h-[400px]`}>
            <FarmCalendarDisplay 
              events={events}
              eventTypeColors={eventTypeColors}
              view={view}
              onView={setView}
              onSelectEvent={handleEventSelect}
            />
          </div>
          
          {selectedEvent && (
            <FarmEventDetailsSidebar 
              selectedEvent={selectedEvent}
              eventTypeColors={eventTypeColors}
              onClose={closeEventDetails}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmCalendarSection;
