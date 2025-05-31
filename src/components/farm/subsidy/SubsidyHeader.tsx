
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface SubsidyHeaderProps {
  onAddSubsidy: () => void;
}

const SubsidyHeader: React.FC<SubsidyHeaderProps> = ({ onAddSubsidy }) => {
  const { t } = useLanguage();

  return (
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>{t('subsidies.title')}</CardTitle>
        <CardDescription>{t('subsidies.subtitle')}</CardDescription>
      </div>
      <Button size="sm" className="gap-1" onClick={onAddSubsidy}>
        <Plus size={16} />
        {t('common.addNewSubsidy')}
      </Button>
    </CardHeader>
  );
};

export default SubsidyHeader;
