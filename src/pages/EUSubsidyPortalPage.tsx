
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, FileText, Upload, X } from 'lucide-react';
import { AgriToolExtensionSimulator } from '@/components/AgriToolExtensionSimulator';
import { toast } from '@/components/ui/use-toast';

const EUSubsidyPortalPage = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    farmName: '',
    address: '',
    registrationNumber: '',
    irrigationType: '',
    certificationStatus: '',
    description: '',
  });
  const [uploadedDocs, setUploadedDocs] = useState({
    landOwnership: false,
    irrigationDeclaration: false,
  });
  const [showExtension, setShowExtension] = useState(true);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = (docType: 'landOwnership' | 'irrigationDeclaration') => {
    setUploadedDocs(prev => ({ ...prev, [docType]: true }));
    toast({
      title: "Document uploaded",
      description: `Your ${docType === 'landOwnership' ? 'Land Ownership Proof' : 'Irrigation Declaration Form'} has been uploaded.`,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Application submitted",
      description: "Your application has been submitted successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#004494] text-white py-4 px-6 border-b border-[#FFCC00]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-8 bg-[#FFCC00] rounded flex items-center justify-center text-[#004494] font-bold">EU</div>
            <h1 className="text-xl font-serif">European Agricultural Guarantee Fund</h1>
          </div>
          <div className="text-sm">
            <span>Portal ID: EAGF-24-ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left side - EU Form */}
            <div className={`${showExtension ? 'lg:w-1/2' : 'w-full'}`}>
              <div className="mb-6">
                <h1 className="text-2xl font-serif text-[#004494]">Smart Irrigation Upgrade Grant</h1>
                <p className="text-gray-600 mt-1">Application Form - Reference: EAGF/IRR/2024/03</p>
              </div>

              <Card className="mb-6">
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="font-serif text-[#004494]">Applicant Information</CardTitle>
                  <CardDescription>Please provide accurate information about your farm.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="farmName">Farm Name</Label>
                      <Input 
                        id="farmName" 
                        name="farmName" 
                        value={formData.farmName} 
                        onChange={handleInputChange} 
                        placeholder="Enter the registered name of your farm" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Complete Address</Label>
                      <Input 
                        id="address" 
                        name="address" 
                        value={formData.address} 
                        onChange={handleInputChange} 
                        placeholder="Enter your farm's full address" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registrationNumber">SIRET or Registration Number</Label>
                      <Input 
                        id="registrationNumber" 
                        name="registrationNumber" 
                        value={formData.registrationNumber} 
                        onChange={handleInputChange} 
                        placeholder="Enter your business registration number" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="irrigationType">Type of Irrigation</Label>
                      <Input 
                        id="irrigationType" 
                        name="irrigationType" 
                        value={formData.irrigationType} 
                        onChange={handleInputChange} 
                        placeholder="Specify current or planned irrigation system" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificationStatus">Certification Status</Label>
                      <Select 
                        value={formData.certificationStatus} 
                        onValueChange={(value) => handleSelectChange('certificationStatus', value)}
                      >
                        <SelectTrigger id="certificationStatus">
                          <SelectValue placeholder="Select certification status" />
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
                        Describe how your irrigation system will improve efficiency
                      </Label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        value={formData.description} 
                        onChange={handleInputChange} 
                        placeholder="Please provide details about efficiency improvements..." 
                        className="min-h-[120px]"
                      />
                    </div>

                    <div className="space-y-3 pt-4">
                      <h3 className="font-medium text-gray-700">Required Documentation</h3>
                      
                      <div className="border rounded-md p-4 space-y-2 bg-gray-50">
                        <Label>Upload Land Ownership Proof</Label>
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
                              <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                              <p className="text-xs text-gray-400 mt-1">PDF, JPG or PNG (max. 10MB)</p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="border rounded-md p-4 space-y-2 bg-gray-50">
                        <Label>Upload Irrigation Declaration Form (signed PDF)</Label>
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
                              <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                              <p className="text-xs text-gray-400 mt-1">PDF only (max. 5MB)</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button type="submit" className="w-full bg-[#004494] hover:bg-[#003366]">
                        Submit Application
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right side - Extension Simulator */}
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

      {/* Footer */}
      <footer className="bg-gray-100 border-t py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-gray-500 font-medium">
            This is a simulated environment for training purposes only.
          </div>
          <div className="flex justify-center mt-4 space-x-6 text-xs text-gray-400">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Use</a>
            <a href="#" className="hover:underline">Contact</a>
            <a href="#" className="hover:underline">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EUSubsidyPortalPage;
