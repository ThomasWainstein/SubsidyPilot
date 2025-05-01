import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay, add, addDays, isSameDay } from 'date-fns';
import { enUS, fr, es, pl, ro } from 'date-fns/locale';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/language';
import { CalendarEvent, EventType } from '@/types/calendar';
import { farms } from '@/data/farms';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useCalendar } from '@/contexts/CalendarContext';
import { generateMockEvents } from '@/utils/mockCalendarData';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

// Map language codes to date-fns locales
const locales = {
  'en': enUS,
  'fr': fr,
  'es': es,
  'pl': pl,
  'ro': ro,
};

const DragAndDropCalendar = withDragAndDrop(Calendar);

const eventTypeColors: Record<EventType, string> = {
  funding: '#1EAEDB', // Bright Blue
  compliance: '#ea384c', // Red
  document: '#9b87f5', // Purple
  task: '#F97316', // Orange
  regulatory: '#FFDEE2', // Soft Pink
};

const CalendarPage: React.FC = () => {
  const { t, language } = useLanguage();
  const { events, setEvents, filters, setFilters, selectedFarms, setSelectedFarms, view, setView } = useCalendar();
  
  const [showEventSidebar, setShowEventSidebar] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    // Load mock events when the component mounts
    if (events.length === 0) {
      setEvents(generateMockEvents());
    }
  }, [setEvents, events.length]);

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

  // Filter events based on selected farms and filters
  const filteredEvents = events.filter(event => {
    // Filter by selected farms
    if (selectedFarms.length > 0 && !selectedFarms.includes(event.farmId)) {
      return false;
    }
    
    // Filter by subsidy program
    if (
      filters.subsidyProgram.length > 0 && 
      event.subsidyProgram && 
      !filters.subsidyProgram.includes(event.subsidyProgram)
    ) {
      return false;
    }
    
    // Filter by regulation type
    if (
      filters.regulationType.length > 0 && 
      event.regulationType && 
      !filters.regulationType.includes(event.regulationType)
    ) {
      return false;
    }
    
    return true;
  });

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventSidebar(true);
  };

  const handleNavigateToFarm = (farmId: string) => {
    window.location.href = `/farm/${farmId}`;
  };

  // Extract unique subsidy programs and regulation types for filters
  const uniqueSubsidyPrograms = Array.from(
    new Set(events.filter(e => e.subsidyProgram).map(e => e.subsidyProgram || ''))
  );
  const uniqueRegulationTypes = Array.from(
    new Set(events.filter(e => e.regulationType).map(e => e.regulationType || ''))
  );

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('calendar.globalCalendar')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('calendar.globalDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
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
          </div>
          
          <div className="lg:col-span-3">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-[700px]">
              <DragAndDropCalendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={{
                  month: true,
                  week: true,
                }}
                view={view}
                onView={(v: any) => setView(v)}
                titleAccessor="title"
                tooltipAccessor={(event: CalendarEvent) => `${event.title} - ${event.farmName}`}
                onSelectEvent={(event: CalendarEvent) => handleEventSelect(event)}
                eventPropGetter={eventStyleGetter}
                popup
                dayLayoutAlgorithm="no-overlap"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event details sidebar */}
      {showEventSidebar && selectedEvent && (
        <div className="fixed top-16 right-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-lg z-30 p-4 overflow-y-auto transition-transform transform animate-slide-up">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">{t('calendar.eventDetails')}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setShowEventSidebar(false)}
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
            
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {t('calendar.farm')}
              </p>
              <p className="text-sm">{selectedEvent.farmName}</p>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={() => handleNavigateToFarm(selectedEvent.farmId)}
              >
                {t('calendar.viewFarm')}
              </Button>
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
  );
};

export default CalendarPage;
