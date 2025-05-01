
import React from 'react';
import { format, isSameDay } from 'date-fns';
import { useLanguage } from '@/contexts/language';
import { CalendarEvent, EventType } from '@/types/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FarmEventDetailsSidebarProps {
  selectedEvent: CalendarEvent | null;
  eventTypeColors: Record<EventType, string>;
  onClose: () => void;
}

const FarmEventDetailsSidebar: React.FC<FarmEventDetailsSidebarProps> = ({
  selectedEvent,
  eventTypeColors,
  onClose,
}) => {
  const { t } = useLanguage();

  if (!selectedEvent) return null;

  return (
    <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">{t('calendar.eventDetails')}</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={onClose}
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
  );
};

export default FarmEventDetailsSidebar;
