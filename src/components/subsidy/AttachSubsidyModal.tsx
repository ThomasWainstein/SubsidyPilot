
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { farms } from '@/data/farms';
import { Subsidy } from '@/types/subsidy';
import { useToast } from '@/hooks/use-toast';

interface AttachSubsidyModalProps {
  isOpen: boolean;
  onClose: () => void;
  subsidy: Subsidy | null;
  onAttach: (subsidyId: string, farmId: string) => void;
}

const AttachSubsidyModal: React.FC<AttachSubsidyModalProps> = ({
  isOpen,
  onClose,
  subsidy,
  onAttach,
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');

  const handleSubmit = () => {
    if (!subsidy || !selectedFarmId) return;
    
    onAttach(subsidy.id, selectedFarmId);
    
    toast({
      title: t('search.actions.attached'),
      description: `${t('messages.subsidyAttachedDesc')}`,
    });
    
    setSelectedFarmId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('subsidies.selectFarm')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="farm-select">{t('common.selectFarm')}</Label>
          <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t('common.selectFarm')} />
            </SelectTrigger>
            <SelectContent>
              {farms.map((farm) => (
                <SelectItem key={farm.id} value={farm.id}>
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedFarmId}>
            {t('common.attach')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttachSubsidyModal;
