
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { AlertTriangle } from 'lucide-react';

const SubsidyEmptyState: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="p-6 border rounded-lg border-dashed text-center bg-gray-50 dark:bg-gray-800">
      <AlertTriangle className="mx-auto mb-3 text-amber-500 h-8 w-8" />
      <h3 className="text-lg font-medium mb-2 dark:text-white">{t('common.noSubsidiesFound')}</h3>
      <p className="text-gray-600 dark:text-gray-300">
        {t('common.noSubsidiesFoundDesc')}
      </p>
      <p className="text-gray-600 dark:text-gray-300 mt-2">
        Click the "Add New Subsidy" button to add your first subsidy manually or import one from a URL.
      </p>
    </div>
  );
};

export default SubsidyEmptyState;
