
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const SubsidyLoadingState: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subsidies.title')}</CardTitle>
        <CardDescription>{t('subsidies.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2">{t('common.loading')}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubsidyLoadingState;
