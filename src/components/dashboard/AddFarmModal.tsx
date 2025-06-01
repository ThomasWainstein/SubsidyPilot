
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
  // Wrap language context usage in try-catch
  let t: any;
  try {
    const { t: translation } = useLanguage();
    t = translation;
  } catch (error) {
    console.error('AddFarmModal: Error getting language context:', error);
    // Fallback translation function
    t = (key: string) => key;
  }

  const navigate = useNavigate();

  const handleManualEntry = () => {
    try {
      onClose();
      // Use the correct route that exists in App.tsx
      navigate('/farm/new');
    } catch (error) {
      console.error('AddFarmModal: Navigation error:', error);
      // Fallback to window.location
      window.location.href = '/farm/new';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {typeof t === 'function' ? t('common.addNewClientFarm') : 'Add New Farm'}
          </DialogTitle>
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
              {typeof t === 'function' ? t('addFarm.startFarmCreation') : 'Start Farm Creation'}
            </Button>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {typeof t === 'function' ? t('common.cancel') : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFarmModal;
