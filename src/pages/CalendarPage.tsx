
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/language';
import { CalendarEvent, EventType } from '@/types/calendar';
import { useCalendar } from '@/contexts/CalendarContext';
import { generateMockEvents } from '@/utils/mockCalendarData';
import CalendarFilters from '@/components/calendar/CalendarFilters';
import CalendarEventSidebar from '@/components/calendar/CalendarEventSidebar';
import CalendarDisplay from '@/components/calendar/CalendarDisplay';

const eventTypeColors: Record<EventType, string> = {
  funding: '#1EAEDB', // Bright Blue
  compliance: '#ea384c', // Red
  document: '#9b87f5', // Purple
  task: '#F97316', // Orange
  regulatory: '#FFDEE2', // Soft Pink
};

const CalendarPage: React.FC = () => {
  const { t } = useLanguage();
  const { 
    events, 
    setEvents, 
    filters, 
    selectedFarms, 
    view, 
    setView 
  } = useCalendar();
  
  const [showEventSidebar, setShowEventSidebar] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    // Load mock events when the component mounts
    if (events.length === 0) {
      setEvents(generateMockEvents());
    }
  }, [setEvents, events.length]);

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

  const handleViewChange = (newView: 'month' | 'week') => {
    setView(newView);
  };

  const handleCloseSidebar = () => {
    setShowEventSidebar(false);
  };

  // Extract unique subsidy programs and regulation types for filters
  const uniqueSubsidyPrograms = Array.from(
    new Set(events.filter(e => e.subsidyProgram).map(e => e.subsidyProgram || ''))
  );
  
  const uniqueRegulationTypes = Array.from(
    new Set(events.filter(e => e.regulationType).map(e => e.regulationType || ''))
  );

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
            <CalendarFilters 
              uniqueSubsidyPrograms={uniqueSubsidyPrograms}
              uniqueRegulationTypes={uniqueRegulationTypes}
              eventTypeColors={eventTypeColors}
            />
          </div>
          
          <div className="lg:col-span-3">
            <CalendarDisplay 
              events={filteredEvents}
              eventTypeColors={eventTypeColors}
              view={view}
              onViewChange={handleViewChange}
              onSelectEvent={handleEventSelect}
            />
          </div>
        </div>
      </div>

      <CalendarEventSidebar 
        selectedEvent={selectedEvent}
        showEventSidebar={showEventSidebar}
        onClose={handleCloseSidebar}
        eventTypeColors={eventTypeColors}
        onNavigateToFarm={handleNavigateToFarm}
      />
    </div>
  );
};

export default CalendarPage;
