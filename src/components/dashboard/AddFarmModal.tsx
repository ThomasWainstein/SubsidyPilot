
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AddFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFarmModal = ({ isOpen, onClose }: AddFarmModalProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('common.addNewClientFarm')}</DialogTitle>
          <DialogDescription>
            Choose how you want to add a new client farm to your portfolio.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="manual" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="document">Document Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="farm-name">Farm Name</Label>
              <Input id="farm-name" placeholder="Enter client farm name" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farm-region">Region</Label>
              <Input id="farm-region" placeholder="Enter region" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farm-tags">Tags (comma separated)</Label>
              <Input id="farm-tags" placeholder="organic, sustainability, etc." />
            </div>
          </TabsContent>
          
          <TabsContent value="document" className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">Drag and drop files here, or click to select files</p>
              <p className="mt-1 text-xs text-gray-500">Support for PDFs, Excel and Word documents</p>
              <Button variant="outline" className="mt-4">Select Files</Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onClose}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFarmModal;
