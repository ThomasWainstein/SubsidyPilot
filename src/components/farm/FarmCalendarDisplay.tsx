
import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, fr, es, pl, ro } from 'date-fns/locale';
import { useLanguage } from '@/contexts/language';
import { CalendarEvent, EventType } from '@/types/calendar';

// Map language codes to date-fns locales
const locales = {
  'en': enUS,
  'fr': fr,
  'es': es,
  'pl': pl,
  'ro': ro,
};

interface FarmCalendarDisplayProps {
  events: CalendarEvent[];
  eventTypeColors: Record<EventType, string>;
  view: 'month' | 'agenda';
  onView: (view: 'month' | 'agenda') => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

const FarmCalendarDisplay: React.FC<FarmCalendarDisplayProps> = ({
  events,
  eventTypeColors,
  view,
  onView,
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
      onView={(v: any) => onView(v)}
      titleAccessor={eventTitleAccessor}
      onSelectEvent={onSelectEvent}
      eventPropGetter={eventStyleGetter}
      popup
    />
  );
};

export default FarmCalendarDisplay;
