
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

const FarmCreationForm = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Section 1: Farm Identity
    farmName: '',
    farmAddress: '',
    legalStatus: '',
    cnpOrCui: '',
    
    // Section 2: Location
    department: '',
    locality: '',
    apiaRegions: [] as string[],
    
    // Section 3: Land Info
    landOwnership: '',
    totalArea: '',
    landUseTypes: [] as string[],
    
    // Section 4: Livestock
    hasLivestock: false,
    animalTypes: {} as Record<string, string>,
    
    // Section 5: Environmental & Technical
    hasEnvironmentalPermits: false,
    
    // Section 6: Subsidy Interests
    subsidyInterests: [] as string[],
    otherSubsidyInterest: '',
    
    // Section 7: Contact & Consent
    mobileNumber: '',
    preferredLanguage: '',
    gdprConsent: false,
    notificationConsent: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: t('common.error'),
        description: 'You must be logged in to create a farm',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.farmName || !formData.farmAddress || !formData.legalStatus || !formData.cnpOrCui) {
      toast({
        title: t('common.error'),
        description: 'Please fill in all required fields in Farm Identity section',
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

    setLoading(true);

    try {
      const farmData = {
        user_id: user.id,
        name: formData.farmName,
        address: formData.farmAddress,
        legal_status: formData.legalStatus,
        cnp_or_cui: formData.cnpOrCui,
        department: formData.department,
        locality: formData.locality,
        apia_region: formData.apiaRegions,
        own_or_lease: formData.landOwnership === 'own',
        total_hectares: formData.totalArea ? parseFloat(formData.totalArea) : null,
        land_use_types: formData.landUseTypes,
        livestock_present: formData.hasLivestock,
        livestock: formData.hasLivestock ? formData.animalTypes : null,
        environmental_permit: formData.hasEnvironmentalPermits,
        subsidy_interest: [...formData.subsidyInterests, formData.otherSubsidyInterest].filter(Boolean),
        phone: formData.mobileNumber,
        preferred_language: formData.preferredLanguage,
        gdpr_consent: formData.gdprConsent,
        notify_consent: formData.notificationConsent
      };

      const { data, error } = await supabase
        .from('farms')
        .insert(farmData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Farm profile created successfully',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: 'Failed to create farm: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (fieldName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: t('common.success'),
        description: `File ${file.name} selected (upload functionality will be added)`,
      });
    }
  };

  const handleCheckboxArrayChange = (array: string[], item: string, checked: boolean, field: string) => {
    const newArray = checked 
      ? [...array, item]
      : array.filter(i => i !== item);
    
    setFormData(prev => ({
      ...prev,
      [field]: newArray
    }));
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
          <p className="text-gray-600">Complete all sections to create a comprehensive farm profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Farm Identity & Legal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Section 1: Farm Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    </div>
                    <input id="id-cert" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('idCert')} />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Location */}
          <Card>
            <CardHeader>
              <CardTitle>Section 2: Location</CardTitle>
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

              <div className="space-y-2">
                <Label>APIA Operating Regions (select all that apply)</Label>
                <div className="grid md:grid-cols-3 gap-2">
                  {[
                    'North-East', 'South-East', 'South-Muntenia', 'South-West Oltenia',
                    'West', 'North-West', 'Center', 'Bucharest-Ilfov'
                  ].map((region) => (
                    <div key={region} className="flex items-center space-x-2">
                      <Checkbox
                        id={region}
                        checked={formData.apiaRegions.includes(region)}
                        onCheckedChange={(checked) => 
                          handleCheckboxArrayChange(formData.apiaRegions, region, checked as boolean, 'apiaRegions')
                        }
                      />
                      <Label htmlFor={region} className="text-sm">{region}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Land Info */}
          <Card>
            <CardHeader>
              <CardTitle>Section 3: Land Info</CardTitle>
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
                    'Aromatic/Medicinal Plants', 'Fallow Land', 'Mixed Use', 'Forestry Plots', 'Other'
                  ].map((landUse) => (
                    <div key={landUse} className="flex items-center space-x-2">
                      <Checkbox
                        id={landUse}
                        checked={formData.landUseTypes.includes(landUse)}
                        onCheckedChange={(checked) => 
                          handleCheckboxArrayChange(formData.landUseTypes, landUse, checked as boolean, 'landUseTypes')
                        }
                      />
                      <Label htmlFor={landUse} className="text-sm">{landUse}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Lease or Ownership Documents (PDF)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="land-docs" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-6 h-6 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-500">Upload land documents</p>
                      </div>
                      <input id="land-docs" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('landDocs')} />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload LPIS or Parcel Maps (optional, PDF)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="parcel-maps" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-6 h-6 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-500">Upload parcel maps (optional)</p>
                      </div>
                      <input id="parcel-maps" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('parcelMaps')} />
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Livestock */}
          <Card>
            <CardHeader>
              <CardTitle>Section 4: Animal Holdings</CardTitle>
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

                  <div className="space-y-2">
                    <Label>Upload ANSVSA registration or animal movement logs (PDF)</Label>
                    <div className="flex items-center justify-center w-full">
                      <label htmlFor="animal-docs" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-2 pb-2">
                          <Upload className="w-6 h-6 mb-2 text-gray-500" />
                          <p className="text-sm text-gray-500">Upload animal registration docs</p>
                        </div>
                        <input id="animal-docs" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('animalDocs')} />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Environmental & Technical */}
          <Card>
            <CardHeader>
              <CardTitle>Section 5: Environmental & Technical Compliance</CardTitle>
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

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Upload Environmental Documents (PDF - optional)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="env-docs" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-6 h-6 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-500">Upload env. docs</p>
                      </div>
                      <input id="env-docs" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('envDocs')} />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Upload Technical Project Documentation (PDF - optional)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="tech-docs" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-6 h-6 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-500">Upload tech docs</p>
                      </div>
                      <input id="tech-docs" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('techDocs')} />
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Subsidy Interests */}
          <Card>
            <CardHeader>
              <CardTitle>Section 6: Subsidy Interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Label>Select the types of subsidies you are interested in:</Label>
              <div className="grid md:grid-cols-2 gap-2">
                {[
                  'Direct area payments', 'Livestock support', 'Agro-environmental & climate', 'Organic farming',
                  'Investments (buildings, equipment)', 'Farm modernization', 'Young farmer aid', 'LEADER rural dev projects',
                  'Forestry/agroforestry', 'Farm diversification', 'On-farm processing', 'CAP promotion/export',
                  'Training/advisory', 'Horizon Europe & EIP-AGRI', 'Irrigation/water', 'Renewable energy'
                ].map((interest) => (
                  <div key={interest} className="flex items-center space-x-2">
                    <Checkbox
                      id={interest}
                      checked={formData.subsidyInterests.includes(interest)}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange(formData.subsidyInterests, interest, checked as boolean, 'subsidyInterests')
                      }
                    />
                    <Label htmlFor={interest} className="text-sm">{interest}</Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="other-subsidy">Other (specify)</Label>
                <Input
                  id="other-subsidy"
                  type="text"
                  placeholder="Specify other subsidy interests"
                  value={formData.otherSubsidyInterest}
                  onChange={(e) => setFormData({ ...formData, otherSubsidyInterest: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Contact & Consent */}
          <Card>
            <CardHeader>
              <CardTitle>Section 7: Contact & Notifications</CardTitle>
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
                      <SelectItem value="other">Other</SelectItem>
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
                  <Label htmlFor="gdpr-consent">✅ I consent to GDPR data processing *</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notification-consent"
                    checked={formData.notificationConsent}
                    onCheckedChange={(checked) => setFormData({ ...formData, notificationConsent: checked as boolean })}
                  />
                  <Label htmlFor="notification-consent">✅ I want to receive subsidy deadline and update notifications</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Farm Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FarmCreationForm;
