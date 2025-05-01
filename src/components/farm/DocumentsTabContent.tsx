
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import DocumentVault from '@/components/DocumentVault';

interface DocumentsTabContentProps {
  farmId: string;
}

export const DocumentsTabContent: React.FC<DocumentsTabContentProps> = ({ farmId }) => {
  const { t } = useLanguage();

  return (
    <Card className="bg-background dark:bg-dark-card">
      <CardHeader>
        <CardTitle className="dark:text-white">{t('farm.documentTitle')}</CardTitle>
        <CardDescription className="dark:text-gray-300">{t('farm.documentSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <DocumentVault farmId={farmId} />
      </CardContent>
    </Card>
  );
};
