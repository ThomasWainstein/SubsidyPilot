import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, isSameDay } from 'date-fns';
import { enUS, fr, es, pl, ro } from 'date-fns/locale';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateFarmEvents } from '@/utils/mockCalendarData';
import { CalendarEvent, EventType } from '@/types/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, X } from 'lucide-react';

// Map language codes to date-fns locales
const locales = {
  'en': enUS,
  'fr': fr,
  'es': es,
  'pl': pl,
  'ro': ro,
};

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

const FarmCalendarSection: React.FC<FarmCalendarSectionProps> = ({ farmId, farmName }) => {
  const { t, language } = useLanguage();
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    // Load mock events for this specific farm
    setEvents(generateFarmEvents(farmId, 8));
  }, [farmId]);

  const localizer = dateFnsLocalizer({
    format: (date, formatStr) => {
      const locale = locales[language as keyof typeof locales] || enUS;
      return format(date, formatStr, { locale });
    },
    parse: (dateString, formatStr) => {
      const locale = locales[language as keyof typeof locales] || enUS;
      return parse(dateString, formatStr, new Date(), { locale });
    },
    startOfWeek: () => {
      const locale = locales[language as keyof typeof locales] || enUS;
      return startOfWeek(new Date(), { locale });
    },
    getDay: (date) => {
      return getDay(date);
    },
    locales: {
      'en-US': enUS,
    },
  });

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = eventTypeColors[event.eventType] || '#9b87f5';
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: event.eventType === 'regulatory' ? '#000' : '#fff',
        border: '0',
        display: 'block'
      }
    };
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const closeEventDetails = () => {
    setSelectedEvent(null);
  };

  // Define accessor functions for the calendar
  const eventStartAccessor = (event: CalendarEvent) => event.start;
  const eventEndAccessor = (event: CalendarEvent) => event.end;
  const eventTitleAccessor = (event: CalendarEvent) => event.title;

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
        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-600 dark:text-blue-300">
            {t('calendar.emailReminders')}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${selectedEvent ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-gray-800 rounded-lg p-0 h-[400px]`}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor={eventStartAccessor}
              endAccessor={eventEndAccessor}
              style={{ height: '100%' }}
              views={{
                month: true,
                agenda: true,
              }}
              view={view}
              onView={(v: any) => setView(v)}
              titleAccessor={eventTitleAccessor}
              onSelectEvent={handleEventSelect}
              eventPropGetter={eventStyleGetter}
              popup
              messages={{
                agenda: t('calendar.agenda'),
                month: t('calendar.month'),
              }}
            />
          </div>
          
          {selectedEvent && (
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{t('calendar.eventDetails')}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={closeEventDetails}
                >
                  <X size={16} />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Badge 
                    style={{ 
                      backgroundColor: eventTypeColors[selectedEvent.eventType], 
                      color: selectedEvent.eventType === 'regulatory' ? '#000' : '#fff' 
                    }}
                    className="mb-2 capitalize"
                  >
                    {selectedEvent.eventType}
                  </Badge>
                  <h4 className="text-lg font-medium">{selectedEvent.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(selectedEvent.start, 'PPP')}
                    {!isSameDay(selectedEvent.start, selectedEvent.end) && (
                      <> - {format(selectedEvent.end, 'PPP')}</>
                    )}
                  </p>
                </div>
                
                {selectedEvent.subsidyProgram && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('calendar.subsidyProgram')}
                    </p>
                    <p className="text-sm">{selectedEvent.subsidyProgram}</p>
                  </div>
                )}
                
                {selectedEvent.regulationType && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('calendar.regulationType')}
                    </p>
                    <p className="text-sm">{selectedEvent.regulationType}</p>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('calendar.description')}
                    </p>
                    <p className="text-sm">{selectedEvent.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmCalendarSection;
