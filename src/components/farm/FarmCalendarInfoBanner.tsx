
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Info } from 'lucide-react';

const FarmCalendarInfoBanner: React.FC = () => {
  const { t } = useLanguage();
  
  return (
    <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md flex items-start gap-2">
      <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-blue-600 dark:text-blue-300">
        {t('calendar.emailReminders')}
      </p>
    </div>
  );
};

export default FarmCalendarInfoBanner;
