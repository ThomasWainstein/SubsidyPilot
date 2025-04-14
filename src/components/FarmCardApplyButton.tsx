
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { SubsidyApplicationModal } from './SubsidyApplicationModal';

interface FarmCardApplyButtonProps {
  farmId: string;
  subsidyId: string;
  children?: React.ReactNode; // Add support for children
}

const FarmCardApplyButton: React.FC<FarmCardApplyButtonProps> = ({
  farmId,
  subsidyId,
  children
}) => {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        {children || t('common.applyNow')}
      </Button>
      
      <SubsidyApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        farmId={farmId}
        subsidyId={subsidyId}
      />
    </>
  );
};

export default FarmCardApplyButton;
