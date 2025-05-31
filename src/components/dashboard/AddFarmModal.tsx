
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

interface AddFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFarmModal = ({ isOpen, onClose }: AddFarmModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleManualEntry = () => {
    onClose();
    navigate('/new-farm');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('common.addNewClientFarm')}</DialogTitle>
          <DialogDescription>
            Create a comprehensive farm profile with all required information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Fill out the complete farm registration form to add a new client farm to your portfolio
            </p>
            <Button onClick={handleManualEntry} className="w-full">
              {t('addFarm.startFarmCreation')}
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFarmModal;
