
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualSubsidyForm } from '../ManualSubsidyForm';
import { ImportSubsidyForm } from '../ImportSubsidyForm';
import { Subsidy } from '@/types/subsidy';

interface SubsidyAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
  farmRegion: string;
  onAddSubsidy: (subsidy: Subsidy) => void;
}

const SubsidyAddDialog: React.FC<SubsidyAddDialogProps> = ({
  open,
  onOpenChange,
  farmId,
  farmRegion,
  onAddSubsidy
}) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('common.addNewSubsidy')}</DialogTitle>
          <DialogDescription>
            Add a new subsidy opportunity for this farm either by importing from a URL or entering details manually.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manual" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="import">Import from URL</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <ManualSubsidyForm 
              farmId={farmId} 
              farmRegion={farmRegion} 
              onAddSubsidy={onAddSubsidy} 
            />
          </TabsContent>
          <TabsContent value="import">
            <ImportSubsidyForm 
              farmId={farmId}
              farmRegion={farmRegion}
              onAddSubsidy={onAddSubsidy}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SubsidyAddDialog;
