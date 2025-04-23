import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronLeft, Download, FileText, Upload, X } from 'lucide-react';
import { AgriToolExtensionSimulator } from '@/components/AgriToolExtensionSimulator';
import { toast } from '@/components/ui/use-toast';
import { farms } from '@/data/farms';
import { subsidies } from '@/data/subsidies';

const EUSubsidyPortalPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { farmId, subsidyId } = useParams<{ farmId?: string; subsidyId?: string }>();
  
  const farm = farmId ? farms.find(f => f.id === farmId) : null;
  const subsidy = subsidyId ? subsidies.find(s => s.id === subsidyId) : null;
  
  const [formData, setFormData] = useState({
    farmName: farm?.name || '',
    address: '',
    registrationNumber: '',
    irrigationType: farm?.irrigationMethod || '',
    certificationStatus: farm?.certifications?.[0] || '',
    description: '',
  });
  
  const [uploadedDocs, setUploadedDocs] = useState({
    landOwnership: false,
    irrigationDeclaration: false,
  });
  
  const [showExtension, setShowExtension] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = (docType: 'landOwnership' | 'irrigationDeclaration') => {
    toast({
      title: `${t('messages.uploading')} ${docType === 'landOwnership' ? 'land_registry_certificate.pdf' : 'irrigation_form_signed.pdf'}...`,
      description: "",
    });
    
    setTimeout(() => {
      setUploadedDocs(prev => ({ ...prev, [docType]: true }));
      toast({
        title: t('messages.documentUploaded'),
        description: `${t('messages.complete')}`,
      });
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadedDocs.landOwnership && uploadedDocs.irrigationDeclaration) {
      setIsSubmitted(true);
      toast({
        title: t('messages.appSubmitted'),
        description: t('messages.appSubmittedDesc'),
      });
    } else {
      toast({
        title: "Error",
        description: "Please upload all required documents before submitting.",
        variant: "destructive"
      });
    }
  };
  
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-[#004494] text-white py-4 px-6 border-b border-[#FFCC00] sticky top-0 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-12 h-8 bg-[#FFCC00] rounded flex items-center justify-center text-[#004494] font-bold">EU</div>
              <h1 className="text-xl font-serif">{t('euportal.header')}</h1>
            </div>
            <div className="text-sm">
              <span>{t('euportal.portalId')}</span>
            </div>
          </div>
        </header>
        
        <main className="flex-grow py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{t('euportal.appCompletedMessage')}</h1>
              
              <p className="text-gray-600 mb-8">
                Your application has been successfully submitted to the European Agricultural Guarantee Fund.
                Reference number: EAGF-IRR-2024-7852
              </p>
              
              <div className="space-y-4 mb-8">
                <Button variant="outline" className="w-full flex items-center justify-center" onClick={() => {
                  toast({
                    title: t('messages.documentDownloaded'),
                    description: "application_confirmation.pdf " + t('messages.documentDownloadedDesc')
                  });
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('euportal.downloadCompleted')}
                </Button>
              </div>
              
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full bg-[#004494] hover:bg-[#003366]"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t('common.backToDashboard')}
              </Button>
            </div>
          </div>
        </main>
        
        <footer className="bg-gray-100 border-t py-6">
          <div className="container mx-auto px-4">
            <div className="text-center text-sm text-gray-500 font-medium">
              {t('euportal.disclaimer')}
            </div>
            <div className="flex justify-center mt-4 space-x-6 text-xs text-gray-400">
              <a href="#" className="hover:underline">{t('euportal.privacy')}</a>
              <a href="#" className="hover:underline">{t('euportal.terms')}</a>
              <a href="#" className="hover:underline">{t('euportal.contact')}</a>
              <a href="#" className="hover:underline">{t('euportal.accessibility')}</a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#004494] text-white py-4 px-6 border-b border-[#FFCC00] sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-8 bg-[#FFCC00] rounded flex items-center justify-center text-[#004494] font-bold">EU</div>
            <h1 className="text-xl font-serif">{t('euportal.header')}</h1>
          </div>
          <div className="text-sm">
            <span>{t('euportal.portalId')}</span>
          </div>
        </div>
      </header>

      <div className="sticky top-[65px] z-10 bg-white shadow-sm border-b p-2">
        <div className="container mx-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('common.backToDashboard')}
          </Button>
        </div>
      </div>

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className={`${showExtension ? 'lg:w-1/2' : 'w-full'}`}>
              <div className="mb-6">
                <h1 className="text-2xl font-serif text-[#004494]">{t('euportal.title')}</h1>
                <p className="text-gray-600 mt-1">{t('euportal.subtitle')}</p>
              </div>

              <Card className="mb-6">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="font-serif text-[#004494]">{t('euportal.applicantInfo')}</CardTitle>
                  <CardDescription>{t('euportal.applicantInfoDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="farmName">{t('form.farmName')}</Label>
                      <Input 
                        id="farmName" 
                        name="farmName" 
                        value={formData.farmName} 
                        onChange={handleInputChange} 
                        placeholder={t('form.farmName')} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">{t('form.address')}</Label>
                      <Input 
                        id="address" 
                        name="address" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                        placeholder={t('form.address')} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">{t('form.registrationNumber')}</Label>
                      <Input 
                        id="registrationNumber" 
                        name="registrationNumber" 
                        value={formData.registrationNumber} 
                        onChange={handleInputChange} 
                        placeholder={t('form.registrationNumber')} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="irrigationType">{t('form.irrigationMethod')}</Label>
                      <Input 
                        id="irrigationType" 
                        name="irrigationType" 
                        value={formData.irrigationType} 
                        onChange={handleInputChange} 
                        placeholder={t('form.irrigationMethod')} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificationStatus">{t('form.certificationStatus')}</Label>
                      <Select 
                        value={formData.certificationStatus} 
                        onValueChange={(value) => handleSelectChange('certificationStatus', value)}
                      >
                        <SelectTrigger id="certificationStatus">
                          <SelectValue placeholder={t('form.certificationStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="organic">Organic</SelectItem>
                          <SelectItem value="conventional">Conventional</SelectItem>
                          <SelectItem value="carbon">Carbon+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">
                        {t('form.description')}
                      </Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        value={formData.description} 
                        onChange={handleInputChange} 
                        placeholder={t('form.description')} 
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="space-y-3 pt-4">
                      <h3 className="font-medium text-gray-700">{t('euportal.requiredDocs')}</h3>
                      
                      <div className="border rounded-md p-4 space-y-2 bg-gray-50">
                        <Label>{t('euportal.uploadLandProof')}</Label>
                        <div 
                          className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleUpload('landOwnership')}
                        >
                          {uploadedDocs.landOwnership ? (
                            <div className="flex items-center text-green-600">
                              <Check className="mr-2" size={20} />
                              <span>land_registry_certificate.pdf</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="mb-2 text-gray-400" />
                              <p className="text-sm text-gray-500">{t('euportal.dragDrop')}</p>
                              <p className="text-xs text-gray-400 mt-1">{t('euportal.fileTypes')}</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border rounded-md p-4 space-y-2 bg-gray-50">
                        <Label>{t('euportal.uploadIrrigationForm')}</Label>
                        <div 
                          className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleUpload('irrigationDeclaration')}
                        >
                          {uploadedDocs.irrigationDeclaration ? (
                            <div className="flex items-center text-green-600">
                              <Check className="mr-2" size={20} />
                              <span>irrigation_form_signed.pdf</span>
                            </div>
                          ) : (
                            <>
                              <Upload className="mb-2 text-gray-400" />
                              <p className="text-sm text-gray-500">{t('euportal.dragDrop')}</p>
                              <p className="text-xs text-gray-400 mt-1">{t('euportal.pdfOnly')}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 space-y-4">
                      <Button 
                        type="submit" 
                        className="w-full bg-[#004494] hover:bg-[#003366]"
                      >
                        {t('euportal.submitApp')}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: t('messages.documentDownloaded'),
                            description: "application_draft.pdf " + t('messages.documentDownloadedDesc')
                          });
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {t('euportal.downloadCompleted')}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {showExtension && (
              <div className="lg:w-1/2">
                <AgriToolExtensionSimulator 
                  formData={formData}
                  setFormData={setFormData}
                  uploadedDocs={uploadedDocs}
                  setUploadedDocs={setUploadedDocs}
                />
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowExtension(!showExtension)}
              className="mr-4"
            >
              {showExtension ? 'Hide Extension' : 'Show Extension'}
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-gray-100 border-t py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-gray-500 font-medium">
            {t('euportal.disclaimer')}
          </div>
          <div className="flex justify-center mt-4 space-x-6 text-xs text-gray-400">
            <a href="#" className="hover:underline">{t('euportal.privacy')}</a>
            <a href="#" className="hover:underline">{t('euportal.terms')}</a>
            <a href="#" className="hover:underline">{t('euportal.contact')}</a>
            <a href="#" className="hover:underline">{t('euportal.accessibility')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EUSubsidyPortalPage;
