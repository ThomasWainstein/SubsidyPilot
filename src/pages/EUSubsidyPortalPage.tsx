
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronLeft, Download, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const EUSubsidyPortalPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
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
      title: `Uploading ${docType === 'landOwnership' ? 'land_registry_certificate.pdf' : 'irrigation_form_signed.pdf'}...`,
      description: "",
    });
    
    setTimeout(() => {
      setUploadedDocs(prev => ({ ...prev, [docType]: true }));
      toast({
        title: 'Document uploaded successfully',
        description: 'Upload complete',
      });
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadedDocs.landOwnership && uploadedDocs.irrigationDeclaration) {
      setIsSubmitted(true);
      toast({
        title: 'Application submitted successfully',
        description: 'Your application has been submitted for review',
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
              <h1 className="text-xl font-serif">European Agricultural Guarantee Fund</h1>
            </div>
            <div className="text-sm">
              <span>Portal ID: EAGF-24-ONLINE</span>
            </div>
          </div>
        </header>
        
        <main className="flex-grow py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Completed Successfully</h1>
              
              <p className="text-gray-600 mb-8">
                Your application has been successfully submitted to the European Agricultural Guarantee Fund.
                Reference number: EAGF-IRR-2024-7852
              </p>
              
              <div className="space-y-4 mb-8">
                <Button variant="outline" className="w-full flex items-center justify-center" onClick={() => {
                  toast({
                    title: 'Document downloaded',
                    description: "application_confirmation.pdf has been downloaded"
                  });
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Confirmation PDF
                </Button>
              </div>
              
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full bg-[#004494] hover:bg-[#003366]"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </main>
        
        <footer className="bg-gray-100 border-t py-6">
          <div className="container mx-auto px-4">
            <div className="text-center text-sm text-gray-500 font-medium">
              This is a simulated environment for training purposes only.
            </div>
            <div className="flex justify-center mt-4 space-x-6 text-xs text-gray-400">
              <a href="#" className="hover:underline">Privacy Policy</a>
              <a href="#" className="hover:underline">Terms of Service</a>
              <a href="#" className="hover:underline">Contact</a>
              <a href="#" className="hover:underline">Accessibility</a>
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
            <h1 className="text-xl font-serif">European Agricultural Guarantee Fund</h1>
          </div>
          <div className="text-sm">
            <span>Portal ID: EAGF-24-ONLINE</span>
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
            Back to Dashboard
          </Button>
        </div>
      </div>

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-serif text-[#004494]">Smart Irrigation Improvement Grant</h1>
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
                      placeholder="Enter farm name" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address" 
                      name="address" 
                      value={formData.address} 
                      onChange={handleInputChange} 
                      placeholder="Enter farm address" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input 
                      id="registrationNumber" 
                      name="registrationNumber" 
                      value={formData.registrationNumber} 
                      onChange={handleInputChange} 
                      placeholder="Enter registration number" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="irrigationType">Irrigation Method</Label>
                    <Input 
                      id="irrigationType" 
                      name="irrigationType" 
                      value={formData.irrigationType} 
                      onChange={handleInputChange} 
                      placeholder="Enter irrigation method" 
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
                    <Label htmlFor="description">Project Description</Label>
                    <Textarea 
                      id="description" 
                      name="description" 
                      value={formData.description} 
                      onChange={handleInputChange} 
                      placeholder="Describe your irrigation improvement project" 
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-3 pt-4">
                    <h3 className="font-medium text-gray-700">Required Documents</h3>
                    
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

                  <div className="pt-4 space-y-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-[#004494] hover:bg-[#003366]"
                    >
                      Submit Application
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: 'Document downloaded',
                          description: "application_draft.pdf has been downloaded"
                        });
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Draft PDF
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="bg-gray-100 border-t py-6 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-gray-500 font-medium">
            This is a simulated environment for training purposes only.
          </div>
          <div className="flex justify-center mt-4 space-x-6 text-xs text-gray-400">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Contact</a>
            <a href="#" className="hover:underline">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EUSubsidyPortalPage;
