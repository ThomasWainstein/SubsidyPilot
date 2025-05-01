
import React, { createContext, useContext, useState } from 'react';
import { CalendarEvent, CalendarFilter, FarmBasicInfo } from '@/types/calendar';

interface CalendarContextType {
  events: CalendarEvent[];
  filters: CalendarFilter;
  selectedFarms: string[];
  view: 'month' | 'week';
  setEvents: (events: CalendarEvent[]) => void;
  setFilters: (filters: Partial<CalendarFilter>) => void;
  addEvent: (event: CalendarEvent) => void;
  removeEvent: (eventId: string) => void;
  toggleFarmSelection: (farmId: string) => void;
  setSelectedFarms: (farmIds: string[]) => void;
  setView: (view: 'month' | 'week') => void;
}

const defaultFilters: CalendarFilter = {
  subsidyProgram: [],
  regulationType: [],
};

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filters, setFiltersState] = useState<CalendarFilter>(defaultFilters);
  const [selectedFarms, setSelectedFarmsState] = useState<string[]>([]);
  const [view, setView] = useState<'month' | 'week'>('month');

  const setFilters = (newFilters: Partial<CalendarFilter>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const addEvent = (event: CalendarEvent) => {
    setEvents(prev => [...prev, event]);
  };

  const removeEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const toggleFarmSelection = (farmId: string) => {
    setSelectedFarmsState(prev => 
      prev.includes(farmId) 
        ? prev.filter(id => id !== farmId) 
        : [...prev, farmId]
    );
  };

  const setSelectedFarms = (farmIds: string[]) => {
    setSelectedFarmsState(farmIds);
  };

  return (
    <CalendarContext.Provider 
      value={{ 
        events, 
        filters, 
        selectedFarms, 
        view, 
        setEvents, 
        setFilters, 
        addEvent, 
        removeEvent, 
        toggleFarmSelection, 
        setSelectedFarms, 
        setView 
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}
