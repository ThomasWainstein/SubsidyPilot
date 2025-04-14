
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
import { Check, Download, ExternalLink, FileText, Upload, X } from 'lucide-react';
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
    { name: "Land Registry Certificate", type: "official", uploaded: false },
    { name: "Irrigation Form", type: "form", uploaded: false }
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
      title: "Document uploaded",
      description: `${updatedDocs[index].name} has been uploaded successfully.`,
    });
  };
  
  // Handle form generation
  const handleGenerateForm = (index: number) => {
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
      title: "Form generated",
      description: `${updatedDocs[index].name} has been generated and filled with your farm data.`,
    });
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
          <DialogTitle>Prepare Your Subsidy Application</DialogTitle>
          <DialogDescription>
            Let's prepare all the documents you need before going to the official EU portal.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="documents" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents">
              Documents
              {docsCompleteCount === requiredDocs.length && <Check size={14} className="ml-1 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="summary">
              Summary
              {preparationStatus.readyToSubmit && <Check size={14} className="ml-1 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="portal" disabled={!preparationStatus.readyToSubmit}>
              EU Portal
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Document Checklist</h3>
                <div className="text-sm text-gray-500">
                  {docsCompleteCount} of {requiredDocs.length} ready
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
                        <p className="text-xs text-gray-500">{doc.type === 'official' ? 'Official document' : 'Application form'}</p>
                      </div>
                    </div>
                    
                    <div>
                      {doc.uploaded ? (
                        <div className="flex items-center text-green-600">
                          <Check size={18} className="mr-1" />
                          <span className="text-sm">Ready</span>
                        </div>
                      ) : doc.type === 'form' ? (
                        <Button size="sm" onClick={() => handleGenerateForm(index)}>
                          <FileText size={14} className="mr-1" />
                          Generate Form
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleUploadDocument(index)}>
                          <Upload size={14} className="mr-1" />
                          Upload Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {docsCompleteCount === requiredDocs.length && (
                <div className="pt-2 flex justify-end">
                  <Button onClick={() => setActiveTab('summary')}>
                    Continue to Summary
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
                  Application Preparation Complete
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  All required documents are ready. You can now proceed to the official EU portal to submit your application.
                </p>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Platform Action Summary</h3>
                
                <div className="border rounded-md divide-y">
                  <div className="p-3 flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span className="text-sm">Documents uploaded and verified</span>
                  </div>
                  
                  <div className="p-3 flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span className="text-sm">Forms auto-filled with farm data</span>
                  </div>
                  
                  <div className="p-3 flex items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <span className="text-sm">Application preview generated</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">Download Completed Documents</h3>
                
                <div className="space-y-2">
                  {requiredDocs.map((doc, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => toast({
                        title: "Document downloaded",
                        description: `${doc.name} has been downloaded to your device.`,
                      })}
                    >
                      <Download size={14} className="mr-2" />
                      {doc.name}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="pt-2 flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('documents')}>
                  Back to Documents
                </Button>
                <Button onClick={() => setActiveTab('portal')}>
                  Continue to EU Portal
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="portal" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h3 className="font-medium text-blue-800">Ready to Apply</h3>
                <p className="text-sm text-blue-700 mt-1">
                  You've prepared all necessary documents. Click below to go to the official subsidy portal.
                </p>
              </div>
              
              <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
                <p className="text-sm text-amber-700 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  The AgriTool Chrome Extension will automatically help you fill out the EU application form when you visit the site.
                </p>
              </div>
              
              <Button 
                className="w-full mt-4" 
                onClick={handleRedirectToEUPortal}
                size="lg"
              >
                <ExternalLink size={16} className="mr-2" />
                Continue to EU Application Portal
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab !== 'portal' && preparationStatus.readyToSubmit && (
            <Button onClick={() => setActiveTab('portal')}>
              Skip to EU Portal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
