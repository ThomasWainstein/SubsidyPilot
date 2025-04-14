
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, FileText, X, ChevronDown, ChevronUp, PlusCircle, ArrowRight, Clock } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(true);
  const [completionPercent, setCompletionPercent] = useState(0);
  const [showAutofillAnimation, setShowAutofillAnimation] = useState(false);
  const [farmProfileData, setFarmProfileData] = useState({
    farmName: 'GreenFields Cooperative',
    address: '123 Rural Road, Eco Valley, FR-75001',
    registrationNumber: 'SIRET-12345678900001',
    irrigationType: 'Drip with smart sensors',
    certificationStatus: 'organic',
    description: 'Our irrigation upgrade will integrate IoT moisture sensors with automated drip systems to reduce water usage by 40% while maintaining optimal soil conditions for organic production.'
  });

  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([
    { name: 'Land Registry Certificate', uploaded: uploadedDocs.landOwnership, type: 'official' },
    { name: 'Irrigation Declaration Form', uploaded: uploadedDocs.irrigationDeclaration, type: 'form' }
  ]);

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
      { name: 'Land Registry Certificate', uploaded: uploadedDocs.landOwnership, type: 'official' },
      { name: 'Irrigation Declaration Form', uploaded: uploadedDocs.irrigationDeclaration, type: 'form' }
    ]);
  }, [formData, uploadedDocs]);

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
        title: "Form autofilled",
        description: "Your farm profile data has been used to fill the form.",
      });
    }, 1800);
  };

  // Use completed PDF from AgriTool
  const handleUseCompletedPDF = () => {
    setUploadedDocs(prev => ({ ...prev, irrigationDeclaration: true }));
    
    toast({
      title: "PDF form added",
      description: "Your completed Irrigation Declaration Form has been uploaded.",
    });
  };

  // Upload document from vault
  const handleUploadFromVault = (docType: 'landOwnership' | 'irrigationDeclaration') => {
    setUploadedDocs(prev => ({ ...prev, [docType]: true }));
    
    toast({
      title: "Document uploaded from vault",
      description: `Your ${docType === 'landOwnership' ? 'Land Registry Certificate' : 'Irrigation Declaration Form'} has been uploaded from your document vault.`,
    });
  };

  return (
    <div className="relative">
      {/* Extension header */}
      <div className="bg-white border border-gray-200 rounded-t-lg p-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center text-white font-bold mr-2">A</div>
          <span className="font-medium">AgriTool Assistant</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </Button>
      </div>

      {isExpanded && (
        <Card className="mt-0 border-t-0 rounded-t-none shadow-md">
          <CardHeader className="bg-green-50 border-b pb-3">
            <CardTitle className="text-lg flex items-center">
              <span className="text-green-700">Application Assistant</span>
              {showAutofillAnimation && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
              )}
            </CardTitle>
            <CardDescription>
              We've detected you're filling out an EU subsidy application
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="space-y-4">
              {/* Completion progress */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Application completion</span>
                  <span className="text-sm font-medium">{completionPercent}%</span>
                </div>
                <Progress value={completionPercent} className="h-2" />
                
                <p className="text-sm mt-2 text-gray-600">
                  {completionPercent < 50 
                    ? "Let's help you complete this application." 
                    : completionPercent < 100 
                      ? "Great! Your form is almost complete — let's finish it together." 
                      : "Excellent! Your application is complete and ready to submit."}
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
                  Autofill from Farm Profile
                </Button>
                
                <div className="border rounded-md divide-y">
                  <div className="p-3">
                    <h3 className="font-medium text-sm mb-2">Required Documents</h3>
                    
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
                                Upload from Vault
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
                        Use Completed PDF from AgriTool
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
                        ? "I can help you fill this form using data from your farm profile." 
                        : completionPercent < 50
                          ? "You've made a good start! I've suggested some text for the remaining fields."
                          : completionPercent < 100
                            ? "Great progress! You still need to upload the irrigation declaration form before submitting."
                            : "Perfect! Your application is complete. You can now submit it to the EU portal."}
                    </p>
                    
                    {completionPercent >= 50 && completionPercent < 100 && (
                      <div className="mt-2 flex items-center text-xs text-amber-700">
                        <Clock size={12} className="mr-1" />
                        <span>Don't forget to review all details before final submission</span>
                      </div>
                    )}
                    
                    {completionPercent === 100 && (
                      <div className="mt-2">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-sm h-8 mt-1">
                          <ArrowRight size={14} className="mr-1" />
                          Ready to Submit
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
