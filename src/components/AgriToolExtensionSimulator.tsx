
import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  FileText, 
  X, 
  ChevronDown, 
  ChevronUp, 
  PlusCircle, 
  ArrowRight, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/components/ui/use-toast';

// Types for the extension simulator
interface ExtensionSimulatorProps {
  formData: {
    farmName: string;
    address: string;
    registrationNumber: string;
    irrigationType: string;
    certificationStatus: string;
    description: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    farmName: string;
    address: string;
    registrationNumber: string;
    irrigationType: string;
    certificationStatus: string;
    description: string;
  }>>;
  uploadedDocs: {
    landOwnership: boolean;
    irrigationDeclaration: boolean;
  };
  setUploadedDocs: React.Dispatch<React.SetStateAction<{
    landOwnership: boolean;
    irrigationDeclaration: boolean;
  }>>;
}

// Document type for the required documents list
interface RequiredDocument {
  name: string;
  uploaded: boolean;
  type: 'official' | 'form';
}

export const AgriToolExtensionSimulator: React.FC<ExtensionSimulatorProps> = ({
  formData,
  setFormData,
  uploadedDocs,
  setUploadedDocs
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [showAutofillAnimation, setShowAutofillAnimation] = useState(false);
  const [showFieldNotification, setShowFieldNotification] = useState(false);
  const [farmProfileData, setFarmProfileData] = useState({
    farmName: 'GreenFields Cooperative',
    address: '123 Rural Road, Eco Valley, FR-75001',
    registrationNumber: 'SIRET-12345678900001',
    irrigationType: 'Drip with smart sensors',
    certificationStatus: 'organic',
    description: 'Our irrigation upgrade will integrate IoT moisture sensors with automated drip systems to reduce water usage by 40% while maintaining optimal soil conditions for organic production.'
  });

  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([
    { name: t('common.landRegistryCertificate'), uploaded: uploadedDocs.landOwnership, type: 'official' },
    { name: t('common.irrigationForm'), uploaded: uploadedDocs.irrigationDeclaration, type: 'form' }
  ]);

  // Update translation of document names when language changes
  useEffect(() => {
    setRequiredDocs([
      { name: t('common.landRegistryCertificate'), uploaded: uploadedDocs.landOwnership, type: 'official' },
      { name: t('common.irrigationForm'), uploaded: uploadedDocs.irrigationDeclaration, type: 'form' }
    ]);
  }, [t, uploadedDocs]);

  // Update completion percentage based on form and document status
  useEffect(() => {
    let filledFields = 0;
    const totalFields = Object.keys(formData).length;
    
    // Count filled form fields
    Object.values(formData).forEach(value => {
      if (value && value.trim() !== '') filledFields++;
    });
    
    // Count uploaded documents
    const uploadedDocsCount = Object.values(uploadedDocs).filter(Boolean).length;
    const totalDocs = Object.keys(uploadedDocs).length;
    
    const totalItems = totalFields + totalDocs;
    const filledItems = filledFields + uploadedDocsCount;
    
    setCompletionPercent(Math.round((filledItems / totalItems) * 100));
    
    // Update required docs status
    setRequiredDocs([
      { name: t('common.landRegistryCertificate'), uploaded: uploadedDocs.landOwnership, type: 'official' },
      { name: t('common.irrigationForm'), uploaded: uploadedDocs.irrigationDeclaration, type: 'form' }
    ]);
    
    // If we've got 50% or more fields filled and the notification hasn't been shown yet, show it
    if (filledFields >= 3 && !showFieldNotification) {
      setTimeout(() => {
        toast({
          title: `17 ${t('messages.detectedFields')} | 11 ${t('messages.autoFilled')} | 6 ${t('messages.remaining')}`,
          description: "",
        });
        setShowFieldNotification(true);
      }, 1500);
    }
  }, [formData, uploadedDocs, t, showFieldNotification]);

  // Auto-fill form with farm profile data
  const handleAutofill = () => {
    setShowAutofillAnimation(true);
    
    // Simulate gradual form filling for visual effect
    setTimeout(() => {
      setFormData(prev => ({ ...prev, farmName: farmProfileData.farmName }));
    }, 300);
    
    setTimeout(() => {
      setFormData(prev => ({ ...prev, address: farmProfileData.address }));
    }, 600);
    
    setTimeout(() => {
      setFormData(prev => ({ ...prev, registrationNumber: farmProfileData.registrationNumber }));
    }, 900);
    
    setTimeout(() => {
      setFormData(prev => ({ ...prev, irrigationType: farmProfileData.irrigationType }));
    }, 1200);
    
    setTimeout(() => {
      setFormData(prev => ({ ...prev, certificationStatus: farmProfileData.certificationStatus }));
    }, 1500);
    
    setTimeout(() => {
      setFormData(prev => ({ ...prev, description: farmProfileData.description }));
      setShowAutofillAnimation(false);
      
      toast({
        title: t('messages.formAutofilled'),
        description: t('messages.formAutofilledDesc'),
      });
    }, 1800);
  };

  // Use completed PDF from AgriTool
  const handleUseCompletedPDF = () => {
    // Simulate loading
    toast({
      title: t('messages.uploading') + " irrigation_form.pdf...",
      description: "",
    });
    
    setTimeout(() => {
      setUploadedDocs(prev => ({ ...prev, irrigationDeclaration: true }));
      
      toast({
        title: "✅ " + t('messages.complete'),
        description: "",
      });
      
      toast({
        title: t('messages.pdfFormAdded'),
        description: t('messages.pdfFormAddedDesc'),
      });
    }, 1500);
  };

  // Upload document from vault
  const handleUploadFromVault = (docType: 'landOwnership' | 'irrigationDeclaration') => {
    // Simulate upload process
    toast({
      title: t('messages.uploading') + ` ${docType === 'landOwnership' ? 'land_registry.pdf' : 'irrigation_declaration.pdf'}...`,
      description: "",
    });
    
    setTimeout(() => {
      setUploadedDocs(prev => ({ ...prev, [docType]: true }));
      
      toast({
        title: "✅ " + t('messages.complete'),
        description: "",
      });
      
      toast({
        title: t('messages.docUploadedFromVault'),
        description: `${docType === 'landOwnership' ? t('common.landRegistryCertificate') : t('common.irrigationForm')} ${t('messages.docUploadedFromVaultDesc')}`,
      });
    }, 1500);
  };

  return (
    <div className="relative">
      {/* Extension header */}
      <div className="bg-white border border-gray-200 rounded-t-lg p-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center text-white font-bold mr-2">A</div>
          <span className="font-medium">{t('extension.assistant')}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </Button>
      </div>

      {isExpanded && (
        <Card className="mt-0 border-t-0 rounded-t-none shadow-md">
          <CardHeader className="bg-green-50 border-b pb-3">
            <CardTitle className="text-lg flex items-center">
              <span className="text-green-700">{t('extension.appAssistant')}</span>
              {showAutofillAnimation && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
              )}
            </CardTitle>
            <CardDescription>
              {t('extension.appAssistantDesc')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="space-y-4">
              {/* Completion progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{t('extension.appCompletion')}</span>
                  <span className="text-sm font-medium">{completionPercent}%</span>
                </div>
                <Progress value={completionPercent} className="h-2" />
                
                <p className="text-sm mt-2 text-gray-600">
                  {completionPercent < 50 
                    ? t('extension.letsHelp')
                    : completionPercent < 100 
                      ? t('extension.almostComplete')
                      : t('extension.excellent')}
                </p>
              </div>
              
              {/* Main actions */}
              <div className="space-y-3 pt-2">
                <Button 
                  onClick={handleAutofill} 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={showAutofillAnimation || completionPercent === 100}
                >
                  <PlusCircle size={16} className="mr-2" />
                  {t('extension.autofillProfile')}
                </Button>
                
                <div className="border rounded-md divide-y">
                  <div className="p-3">
                    <h3 className="font-medium text-sm mb-2">{t('extension.requiredDocs')}</h3>
                    
                    <ul className="space-y-3">
                      {requiredDocs.map((doc, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <FileText size={16} className="mr-2 text-gray-400" />
                            <span>{doc.name}</span>
                          </div>
                          
                          {doc.uploaded ? (
                            <Check size={18} className="text-green-600" />
                          ) : (
                            <div className="flex items-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleUploadFromVault(index === 0 ? 'landOwnership' : 'irrigationDeclaration')}
                                className="text-xs"
                              >
                                {t('common.uploadFromVault')}
                              </Button>
                              <X size={18} className="text-red-500 ml-1" />
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {!uploadedDocs.irrigationDeclaration && (
                    <div className="p-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleUseCompletedPDF}
                        className="w-full text-sm"
                      >
                        <FileText size={14} className="mr-2" />
                        {t('extension.useCompletedPDF')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Assistant message */}
              <div className="bg-green-50 p-3 rounded-md border border-green-100 mt-4">
                <div className="flex">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                    A
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      {completionPercent === 0 
                        ? t('extension.fillFormHelp')
                        : completionPercent < 50
                          ? t('extension.goodStart')
                          : completionPercent < 100
                            ? t('extension.greatProgress')
                            : t('extension.perfect')}
                    </p>
                    
                    {completionPercent >= 50 && completionPercent < 100 && (
                      <div className="mt-2 flex items-center text-xs text-amber-700">
                        <Clock size={12} className="mr-1" />
                        <span>{t('extension.reviewReminder')}</span>
                      </div>
                    )}
                    
                    {completionPercent === 100 && (
                      <div className="mt-2">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-sm h-8 mt-1">
                          <ArrowRight size={14} className="mr-1" />
                          {t('extension.readyToSubmit')}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Toast notification */}
              {showFieldNotification && (
                <div className="animate-fade-in bg-blue-50 p-3 rounded-md border border-blue-100 mt-2">
                  <div className="flex items-start">
                    <AlertCircle size={16} className="mr-2 text-blue-500 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">EU Portal Form Detection</p>
                      <p className="mt-1">17 {t('messages.detectedFields')} | 11 {t('messages.autoFilled')} | 6 {t('messages.remaining')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
