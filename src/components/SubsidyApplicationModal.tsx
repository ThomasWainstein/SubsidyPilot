
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Download, FileText, Upload, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { farmDocuments } from '@/data/farms';
import { toast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';

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
  const [preparationStatus, setPreparationStatus] = useState({
    docsReady: false,
    formsAutofilled: false,
    readyToSubmit: false
  });
  
  // Get farm documents
  const farmDocs = farmDocuments[farmId] || [];
  
  // Calculate completion percentage
  const docsCompleteCount = requiredDocs.filter(doc => doc.uploaded).length;
  const completionPercentage = Math.round((docsCompleteCount / requiredDocs.length) * 100);
  
  // Handle document upload
  const handleUploadDocument = (index: number) => {
    // Simulate document scanning animation
    toast({
      title: t('messages.scanningDocument'),
      description: "",
    });
    
    setTimeout(() => {
      const updatedDocs = [...requiredDocs];
      updatedDocs[index].uploaded = true;
      setRequiredDocs(updatedDocs);
      
      // Update preparation status
      if (updatedDocs.every(doc => doc.uploaded)) {
        setPreparationStatus(prev => ({
          ...prev,
          docsReady: true,
          readyToSubmit: prev.formsAutofilled
        }));
      }
      
      toast({
        title: t('messages.documentUploaded'),
        description: `${updatedDocs[index].name} ${t('messages.documentUploadedDesc')}`,
      });
      
      // Show success message when all docs are ready
      if (updatedDocs.every(doc => doc.uploaded)) {
        toast({
          title: "✅ " + t('messages.formSaved'),
          description: "",
        });
      }
    }, 1500);
  };
  
  // Handle form generation
  const handleGenerateForm = (index: number) => {
    // Simulate form generation with OCR and field detection
    toast({
      title: t('messages.scanningDocument'),
      description: "",
    });
    
    setTimeout(() => {
      toast({
        title: "🔎 17 " + t('messages.fieldsDetected'),
        description: "",
      });
    }, 1000);
    
    setTimeout(() => {
      toast({
        title: t('messages.fillingIn') + ": " + t('form.farmName') + "...",
        description: "",
      });
    }, 2000);
    
    setTimeout(() => {
      toast({
        title: t('messages.fillingIn') + ": " + t('form.carbonScore') + "...",
        description: "",
      });
    }, 2500);
    
    setTimeout(() => {
      const updatedDocs = [...requiredDocs];
      updatedDocs[index].uploaded = true;
      setRequiredDocs(updatedDocs);
      
      // Update preparation status
      setPreparationStatus(prev => ({
        ...prev,
        formsAutofilled: true,
        readyToSubmit: prev.docsReady || updatedDocs.every(doc => doc.uploaded)
      }));
      
      toast({
        title: t('messages.formGenerated'),
        description: `${updatedDocs[index].name} ${t('messages.formGeneratedDesc')}`,
      });
      
      // Show success message when all docs are ready
      if (updatedDocs.every(doc => doc.uploaded)) {
        toast({
          title: "✅ " + t('messages.formSaved'),
          description: "",
        });
      }
    }, 3000);
  };
  
  // Handle redirection to the EU portal
  const handleRedirectToEUPortal = () => {
    onClose();
    navigate('/eu-subsidy-portal');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('application.prepareTitle')}</DialogTitle>
          <DialogDescription>
            {t('application.prepareSubtitle')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">
              {t('common.documents')}
              {docsCompleteCount === requiredDocs.length && <Check size={14} className="ml-1 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="summary">
              {t('application.platformSummary')}
              {preparationStatus.readyToSubmit && <Check size={14} className="ml-1 text-green-500" />}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">{t('application.documentChecklist')}</h3>
                <div className="text-sm text-gray-500">
                  {docsCompleteCount} {t('application.docsReady')} {requiredDocs.length}
                </div>
              </div>
              
              <Progress value={completionPercentage} className="h-2" />
              
              <div className="border rounded-md divide-y">
                {requiredDocs.map((doc, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText size={18} className="mr-2 text-gray-400" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.type === 'official' ? t('application.officialDocument') : t('application.applicationForm')}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      {doc.uploaded ? (
                        <div className="flex items-center text-green-600">
                          <Check size={18} className="mr-1" />
                          <span className="text-sm">{t('application.ready')}</span>
                        </div>
                      ) : doc.type === 'form' ? (
                        <Button size="sm" onClick={() => handleGenerateForm(index)}>
                          <FileText size={14} className="mr-1" />
                          {t('common.generateForm')}
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleUploadDocument(index)}>
                          <Upload size={14} className="mr-1" />
                          {t('common.uploadNow')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {docsCompleteCount === requiredDocs.length && (
                <div className="pt-2 flex justify-end">
                  <Button onClick={() => setActiveTab('summary')}>
                    {t('common.continue')}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-md border border-green-100">
                <h3 className="font-medium text-green-800 flex items-center">
                  <Check size={18} className="mr-2" />
                  {t('application.prepComplete')}
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  {t('application.prepCompleteMessage')}
                </p>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium">{t('application.platformSummary')}</h3>
                
                <div className="border rounded-md divide-y">
                  <div className="p-3 flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span className="text-sm">{t('application.docsVerified')}</span>
                  </div>
                  
                  <div className="p-3 flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span className="text-sm">{t('application.formsAutofilled')}</span>
                  </div>
                  
                  <div className="p-3 flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span className="text-sm">{t('application.previewGenerated')}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">{t('application.downloadDocs')}</h3>
                
                <div className="space-y-2">
                  {requiredDocs.map((doc, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => toast({
                        title: t('messages.documentDownloaded'),
                        description: `${doc.name} ${t('messages.documentDownloadedDesc')}`,
                      })}
                    >
                      <Download size={14} className="mr-2" />
                      {doc.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="font-medium text-blue-800">{t('application.readyToApply')}</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {t('application.readyToApplyMessage')}
                </p>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
                <p className="text-sm text-amber-700 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('application.extensionHelp')}
                </p>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={handleRedirectToEUPortal}
                size="lg"
              >
                {t('common.continueToEUPortal')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {activeTab === 'documents' && preparationStatus.readyToSubmit && (
            <Button onClick={() => setActiveTab('summary')}>
              {t('common.skipToEUPortal')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
