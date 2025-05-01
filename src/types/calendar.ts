
export type EventType = 'funding' | 'compliance' | 'document' | 'task' | 'regulatory';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  farmId: string;
  farmName?: string;
  eventType: EventType;
  subsidyProgram?: string;
  regulationType?: string;
  description?: string;
  url?: string;
}

export interface CalendarFilter {
  subsidyProgram: string[];
  regulationType: string[];
}

export interface FarmBasicInfo {
  id: string;
  name: string;
}
