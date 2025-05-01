
import React from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, fr, es, pl, ro } from 'date-fns/locale';
import { CalendarEvent, EventType } from '@/types/calendar';
import { useLanguage } from '@/contexts/language';

// Map language codes to date-fns locales
const locales = {
  'en': enUS,
  'fr': fr,
  'es': es,
  'pl': pl,
  'ro': ro,
};

const DragAndDropCalendar = withDragAndDrop(BigCalendar);

interface CalendarDisplayProps {
  events: CalendarEvent[];
  eventTypeColors: Record<EventType, string>;
  view: 'month' | 'week';
  onViewChange: (view: 'month' | 'week') => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const CalendarDisplay: React.FC<CalendarDisplayProps> = ({
  events,
  eventTypeColors,
  view,
  onViewChange,
  onSelectEvent,
}) => {
  const { language } = useLanguage();
  
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

  // Define accessor functions for the calendar
  const eventStartAccessor = (event: CalendarEvent) => event.start;
  const eventEndAccessor = (event: CalendarEvent) => event.end;
  const eventTitleAccessor = (event: CalendarEvent) => event.title;

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-[700px]">
      <DragAndDropCalendar
        localizer={localizer}
        events={events}
        startAccessor={eventStartAccessor}
        endAccessor={eventEndAccessor}
        style={{ height: '100%' }}
        views={{
          month: true,
          week: true,
        }}
        view={view}
        onView={(v: any) => onViewChange(v)}
        titleAccessor={eventTitleAccessor}
        tooltipAccessor={(event: CalendarEvent) => `${event.title} - ${event.farmName}`}
        onSelectEvent={(event: CalendarEvent) => onSelectEvent(event)}
        eventPropGetter={eventStyleGetter}
        popup
        dayLayoutAlgorithm="no-overlap"
      />
    </div>
  );
};

export default CalendarDisplay;
