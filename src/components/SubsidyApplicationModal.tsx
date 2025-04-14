import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Check } from 'lucide-react';
import { DocumentList } from './subsidy/DocumentList';
import { ApplicationSummary } from './subsidy/ApplicationSummary';

interface RequiredDocument {
  name: string;
  type: 'official' | 'form';
  uploaded: boolean;
}

interface SubsidyApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subsidyId: string;
  farmId: string;
}

export const SubsidyApplicationModal: React.FC<SubsidyApplicationModalProps> = ({
  isOpen,
  onClose,
  subsidyId,
  farmId
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('documents');
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([
    { name: t('common.landRegistryCertificate'), type: "official", uploaded: false },
    { name: t('common.irrigationForm'), type: "form", uploaded: false }
  ]);
  
  const docsCompleteCount = requiredDocs.filter(doc => doc.uploaded).length;
  const completionPercentage = Math.round((docsCompleteCount / requiredDocs.length) * 100);
  
  const handleUploadDocument = (index: number) => {
    toast({ title: t('messages.scanningDocument'), description: "" });
    
    setTimeout(() => {
      const updatedDocs = [...requiredDocs];
      updatedDocs[index].uploaded = true;
      setRequiredDocs(updatedDocs);
      
      toast({
        title: t('messages.documentUploaded'),
        description: `${updatedDocs[index].name} ${t('messages.documentUploadedDesc')}`,
      });
      
      if (updatedDocs.every(doc => doc.uploaded)) {
        toast({ title: "✅ " + t('messages.formSaved'), description: "" });
      }
    }, 1500);
  };
  
  const handleGenerateForm = (index: number) => {
    toast({ title: t('messages.scanningDocument'), description: "" });
    
    setTimeout(() => {
      toast({ title: "🔎 17 " + t('messages.fieldsDetected'), description: "" });
    }, 1000);
    
    setTimeout(() => {
      toast({ title: t('messages.fillingIn') + ": " + t('form.farmName') + "...", description: "" });
    }, 2000);
    
    setTimeout(() => {
      const updatedDocs = [...requiredDocs];
      updatedDocs[index].uploaded = true;
      setRequiredDocs(updatedDocs);
      
      toast({
        title: t('messages.formGenerated'),
        description: `${updatedDocs[index].name} ${t('messages.formGeneratedDesc')}`,
      });
      
      if (updatedDocs.every(doc => doc.uploaded)) {
        toast({ title: "✅ " + t('messages.formSaved'), description: "" });
      }
    }, 3000);
  };
  
  const handleDownloadDocument = (name: string) => {
    toast({
      title: t('messages.documentDownloaded'),
      description: `${name} ${t('messages.documentDownloadedDesc')}`,
    });
  };
  
  const handleRedirectToEUPortal = () => {
    onClose();
    navigate('/eu-subsidy-portal');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('application.prepareTitle')}</DialogTitle>
          <DialogDescription>{t('application.prepareSubtitle')}</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">
              {t('common.documents')}
              {docsCompleteCount === requiredDocs.length && <Check size={14} className="ml-1 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="summary">
              {t('application.platformSummary')}
              {requiredDocs.every(doc => doc.uploaded) && <Check size={14} className="ml-1 text-green-500" />}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4 py-4">
            <DocumentList
              documents={requiredDocs}
              onUploadDocument={handleUploadDocument}
              onGenerateForm={handleGenerateForm}
              completionPercentage={completionPercentage}
            />
            
            {docsCompleteCount === requiredDocs.length && (
              <div className="pt-2 flex justify-end">
                <Button onClick={() => setActiveTab('summary')}>
                  {t('common.continue')}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-4 py-4">
            <ApplicationSummary
              documents={requiredDocs}
              onDownloadDocument={handleDownloadDocument}
              onContinueToPortal={handleRedirectToEUPortal}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {activeTab === 'documents' && requiredDocs.every(doc => doc.uploaded) && (
            <Button onClick={() => setActiveTab('summary')}>
              {t('common.skipToEUPortal')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
