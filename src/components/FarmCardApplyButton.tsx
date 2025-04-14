
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SubsidyApplicationModal } from './SubsidyApplicationModal';

interface FarmCardApplyButtonProps {
  farmId: string;
  subsidyId: string;
  children: React.ReactNode;
}

const FarmCardApplyButton: React.FC<FarmCardApplyButtonProps> = ({
  farmId,
  subsidyId,
  children
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>
        {children}
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
