
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Upload } from 'lucide-react';

const FarmCreationForm = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    farmName: '',
    farmAddress: '',
    legalStatus: '',
    cnpOrCui: '',
    department: '',
    locality: '',
    landOwnership: '',
    totalArea: '',
    cropTypes: [],
    hasLivestock: false,
    animalTypes: {},
    hasEnvironmentalPermits: false,
    subsidyInterests: [],
    mobileNumber: '',
    preferredLanguage: '',
    gdprConsent: false,
    notificationConsent: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.farmName || !formData.farmAddress || !formData.legalStatus) {
      toast({
        title: t('common.error'),
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.gdprConsent) {
      toast({
        title: t('common.error'),
        description: 'GDPR consent is required',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: t('common.success'),
      description: 'Farm profile created successfully',
    });
    navigate('/dashboard');
  };

  const handleFileUpload = (fieldName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: t('common.success'),
        description: `File ${file.name} uploaded successfully`,
      });
    }
  };

  const handleCropTypeChange = (cropType: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        cropTypes: [...prev.cropTypes, cropType]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        cropTypes: prev.cropTypes.filter(type => type !== cropType)
      }));
    }
  };

  const handleSubsidyInterestChange = (interest: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        subsidyInterests: [...prev.subsidyInterests, interest]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        subsidyInterests: prev.subsidyInterests.filter(item => item !== interest)
      }));
    }
  };

  const handleAnimalTypeChange = (animalType: string, quantity: string) => {
    setFormData(prev => ({
      ...prev,
      animalTypes: {
        ...prev.animalTypes,
        [animalType]: quantity
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Farm Profile</h1>
          <p className="text-gray-600">Add your farm details to get started with AgriTool</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Farm Identity & Legal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Farm Identity & Legal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="farm-name">Farm Name *</Label>
                  <Input
                    id="farm-name"
                    type="text"
                    placeholder="Enter farm name"
                    value={formData.farmName}
                    onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal-status">Legal Status *</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, legalStatus: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select legal status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="srl">SRL</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm-address">Farm Address *</Label>
                <Textarea
                  id="farm-address"
                  placeholder="Enter complete farm address"
                  value={formData.farmAddress}
                  onChange={(e) => setFormData({ ...formData, farmAddress: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnp-cui">CNP (for individuals) or CUI (for legal entities) *</Label>
                <Input
                  id="cnp-cui"
                  type="text"
                  placeholder="Enter CNP or CUI"
                  value={formData.cnpOrCui}
                  onChange={(e) => setFormData({ ...formData, cnpOrCui: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Upload ID or Company Certificate (PDF)</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="id-cert" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> ID or certificate
                      </p>
                      <p className="text-xs text-gray-500">PDF files only</p>
                    </div>
                    <input id="id-cert" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('idCert')} />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Location of Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Location of Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, department: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alba">Alba</SelectItem>
                      <SelectItem value="bucharest">Bucharest</SelectItem>
                      <SelectItem value="cluj">Cluj</SelectItem>
                      <SelectItem value="constanta">Constanta</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locality">Locality</Label>
                  <Input
                    id="locality"
                    type="text"
                    placeholder="Enter locality"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Land & Crops */}
          <Card>
            <CardHeader>
              <CardTitle>Land & Crops</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Do you own or lease land?</Label>
                <Select onValueChange={(value) => setFormData({ ...formData, landOwnership: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ownership type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Own</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-area">Total agricultural area (hectares)</Label>
                <Input
                  id="total-area"
                  type="number"
                  placeholder="Enter area in hectares"
                  value={formData.totalArea}
                  onChange={(e) => setFormData({ ...formData, totalArea: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Types of crops/land use (select all that apply)</Label>
                <div className="grid md:grid-cols-3 gap-2">
                  {[
                    'Cereals', 'Vegetables', 'Vineyards', 'Fruit Orchards', 
                    'Pasture/Grassland', 'Greenhouse/Protected Area', 'Industrial Crops',
                    'Aromatic/Medicinal Plants', 'Fallow Land', 'Mixed Use', 'Forestry Plots'
                  ].map((cropType) => (
                    <div key={cropType} className="flex items-center space-x-2">
                      <Checkbox
                        id={cropType}
                        checked={formData.cropTypes.includes(cropType)}
                        onCheckedChange={(checked) => handleCropTypeChange(cropType, checked as boolean)}
                      />
                      <Label htmlFor={cropType} className="text-sm">{cropType}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Upload Lease or Ownership Documents (PDF)</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="land-docs" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> land documents
                      </p>
                    </div>
                    <input id="land-docs" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('landDocs')} />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Animal Holdings */}
          <Card>
            <CardHeader>
              <CardTitle>Animal Holdings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-livestock"
                  checked={formData.hasLivestock}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasLivestock: checked as boolean })}
                />
                <Label htmlFor="has-livestock">Do you manage livestock?</Label>
              </div>

              {formData.hasLivestock && (
                <div className="space-y-4">
                  <Label>Animal Types and Quantities</Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {['Cattle', 'Sheep', 'Goats', 'Swine', 'Poultry', 'Horses', 'Rabbits', 'Bees'].map((animal) => (
                      <div key={animal} className="flex items-center space-x-2">
                        <Label className="w-20">{animal}:</Label>
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={formData.animalTypes[animal] || ''}
                          onChange={(e) => handleAnimalTypeChange(animal, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Environmental & Technical Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Environmental & Technical Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="env-permits"
                  checked={formData.hasEnvironmentalPermits}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasEnvironmentalPermits: checked as boolean })}
                />
                <Label htmlFor="env-permits">Do you hold any environmental permits?</Label>
              </div>
            </CardContent>
          </Card>

          {/* 6. Subsidy Interests */}
          <Card>
            <CardHeader>
              <CardTitle>Subsidy Interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label>Select the types of subsidies you are interested in:</Label>
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  'Direct area-based payments', 'Livestock support schemes', 'Agro-environmental and climate measures',
                  'Organic agriculture support', 'Investment funding (equipment, buildings)', 'Farm modernization',
                  'Young farmers support', 'Rural development project aid (LEADER, etc.)', 'Forestry and agroforestry funding',
                  'Farm diversification (non-ag activities)', 'On-farm processing & short supply chains',
                  'CAP promotion & internationalization grants', 'Training & advisory services',
                  'Innovation & research (Horizon Europe, EIP-AGRI)', 'Irrigation & water management',
                  'Renewable energy production'
                ].map((interest) => (
                  <div key={interest} className="flex items-center space-x-2">
                    <Checkbox
                      id={interest}
                      checked={formData.subsidyInterests.includes(interest)}
                      onCheckedChange={(checked) => handleSubsidyInterestChange(interest, checked as boolean)}
                    />
                    <Label htmlFor={interest} className="text-sm">{interest}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 7. Contact & Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter mobile number"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Language</Label>
                  <Select onValueChange={(value) => setFormData({ ...formData, preferredLanguage: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ro">Romanian</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gdpr-consent"
                    checked={formData.gdprConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, gdprConsent: checked as boolean })}
                    required
                  />
                  <Label htmlFor="gdpr-consent">I consent to GDPR data processing *</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notification-consent"
                    checked={formData.notificationConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, notificationConsent: checked as boolean })}
                  />
                  <Label htmlFor="notification-consent">I want to receive subsidy deadline and update notifications</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit">
              Create Farm Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FarmCreationForm;
