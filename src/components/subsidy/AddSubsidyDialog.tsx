
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, PenTool } from 'lucide-react';
import { ManualSubsidyForm } from './ManualSubsidyForm';
import { ImportSubsidyForm } from './ImportSubsidyForm';
import { Subsidy } from '@/types/subsidy';

interface AddSubsidyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubsidy: (subsidy: Subsidy) => void;
}

export const AddSubsidyDialog: React.FC<AddSubsidyDialogProps> = ({ isOpen, onClose, onAddSubsidy }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('url');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t('common.addSubsidy')}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="url" className="mt-4" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="url" className="flex items-center gap-1">
              <Link size={14} />
              {t('common.importViaUrl')}
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1">
              <PenTool size={14} />
              {t('common.manualEntry')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="url">
            <ImportSubsidyForm onAddSubsidy={onAddSubsidy} />
          </TabsContent>
          
          <TabsContent value="manual">
            <ManualSubsidyForm onAddSubsidy={onAddSubsidy} onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
