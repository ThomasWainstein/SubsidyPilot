
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { useCreateFarm } from '@/hooks/useFarms';
import { farmCreationSchema, type FarmCreationData, standardRegions } from '@/schemas/farmValidation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';

const FarmCreationForm = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const createFarmMutation = useCreateFarm();

  const form = useForm<FarmCreationData>({
    resolver: zodResolver(farmCreationSchema),
    defaultValues: {
      farmName: '',
      farmAddress: '',
      legalStatus: '',
      cnpOrCui: '',
      department: '',
      locality: '',
      apiaRegions: [],
      landOwnership: '',
      totalArea: '',
      landUseTypes: [],
      hasLivestock: false,
      animalTypes: {},
      hasEnvironmentalPermits: false,
      subsidyInterests: [],
      otherSubsidyInterest: '',
      mobileNumber: '',
      preferredLanguage: '',
      gdprConsent: false,
      notificationConsent: false,
    },
  });

  const onSubmit = async (data: FarmCreationData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a farm',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Creating farm with data:', data);
      console.log('User ID:', user.id);
      
      const farmData = {
        name: data.farmName,
        address: data.farmAddress,
        legal_status: data.legalStatus,
        cnp_or_cui: data.cnpOrCui,
        department: data.department,
        locality: data.locality,
        apia_region: data.apiaRegions,
        own_or_lease: data.landOwnership === 'own',
        total_hectares: data.totalArea ? parseFloat(data.totalArea) : null,
        land_use_types: data.landUseTypes,
        livestock_present: data.hasLivestock,
        livestock: data.hasLivestock ? data.animalTypes : null,
        environmental_permit: data.hasEnvironmentalPermits,
        subsidy_interest: [...data.subsidyInterests, data.otherSubsidyInterest].filter(Boolean),
        phone: data.mobileNumber,
        preferred_language: data.preferredLanguage,
        gdpr_consent: data.gdprConsent,
        notify_consent: data.notificationConsent,
      };

      console.log('Submitting farm data to Supabase:', farmData);
      const createdFarm = await createFarmMutation.mutateAsync(farmData);
      console.log('Farm created successfully:', createdFarm);
      
      toast({
        title: 'Success',
        description: 'Farm profile created successfully!',
      });
      
      // Navigate to the specific farm page instead of dashboard
      navigate(`/farm/${createdFarm.id}`);
    } catch (error: any) {
      console.error('Error creating farm:', error);
      toast({
        title: 'Error',
        description: `Failed to create farm: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (fieldName: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implement file upload to Supabase Storage
      console.log(`File selected for ${fieldName}:`, file.name);
      toast({
        title: 'File Upload',
        description: `File ${file.name} selected for ${fieldName}. Upload functionality will be implemented.`,
      });
    }
  };

  const handleCheckboxArrayChange = (array: string[], item: string, checked: boolean, field: keyof FarmCreationData) => {
    const newArray = checked 
      ? [...array, item]
      : array.filter(i => i !== item);
    
    form.setValue(field as any, newArray);
  };

  const handleAnimalTypeChange = (animalType: string, quantity: string) => {
    const currentTypes = form.getValues('animalTypes');
    form.setValue('animalTypes', {
      ...currentTypes,
      [animalType]: quantity
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please log in to create a farm profile.</p>
          <Button onClick={() => navigate('/auth')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Farm Profile</h1>
          <p className="text-gray-600">Complete all sections to create a comprehensive farm profile</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                  {...form.register('farmName')}
                />
                {form.formState.errors.farmName && (
                  <p className="text-sm text-red-500">{form.formState.errors.farmName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm-address">Farm Address *</Label>
                <Textarea
                  id="farm-address"
                  placeholder="Enter complete farm address"
                  {...form.register('farmAddress')}
                />
                {form.formState.errors.farmAddress && (
                  <p className="text-sm text-red-500">{form.formState.errors.farmAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal-status">Legal Status *</Label>
                <Select onValueChange={(value) => form.setValue('legalStatus', value)}>
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
                {form.formState.errors.legalStatus && (
                  <p className="text-sm text-red-500">{form.formState.errors.legalStatus.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnp-cui">CNP (for individuals) or CUI (for legal entities) *</Label>
                <Input
                  id="cnp-cui"
                  type="text"
                  placeholder="Enter CNP or CUI"
                  {...form.register('cnpOrCui')}
                />
                {form.formState.errors.cnpOrCui && (
                  <p className="text-sm text-red-500">{form.formState.errors.cnpOrCui.message}</p>
                )}
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
                  <Label htmlFor="department">Department *</Label>
                  <Select onValueChange={(value) => form.setValue('department', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {standardRegions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region.charAt(0).toUpperCase() + region.slice(1).replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locality">Locality</Label>
                  <Input
                    id="locality"
                    type="text"
                    placeholder="Enter locality (free text)"
                    {...form.register('locality')}
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
                        checked={form.getValues('apiaRegions').includes(region)}
                        onCheckedChange={(checked) => 
                          handleCheckboxArrayChange(form.getValues('apiaRegions'), region, checked as boolean, 'apiaRegions')
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
              <CardTitle>Section 3: Types of Crops / Land Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Do you own or lease land?</Label>
                <Select onValueChange={(value) => form.setValue('landOwnership', value)}>
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
                  {...form.register('totalArea')}
                />
              </div>

              <div className="space-y-2">
                <Label>Types of crops/land use (select all that apply) *</Label>
                <div className="grid md:grid-cols-3 gap-2">
                  {[
                    'cereals', 'vegetables', 'vineyards', 'fruit_orchards', 
                    'pasture_grassland', 'greenhouse_protected', 'industrial_crops',
                    'aromatic_medicinal_plants', 'fallow_land', 'mixed_use', 'forestry_plots'
                  ].map((landUse) => (
                    <div key={landUse} className="flex items-center space-x-2">
                      <Checkbox
                        id={landUse}
                        checked={form.getValues('landUseTypes').includes(landUse)}
                        onCheckedChange={(checked) => 
                          handleCheckboxArrayChange(form.getValues('landUseTypes'), landUse, checked as boolean, 'landUseTypes')
                        }
                      />
                      <Label htmlFor={landUse} className="text-sm">
                        {landUse.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="other"
                      checked={form.getValues('landUseTypes').includes('other')}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange(form.getValues('landUseTypes'), 'other', checked as boolean, 'landUseTypes')
                      }
                    />
                    <Label htmlFor="other" className="text-sm">Other</Label>
                  </div>
                </div>
                {form.getValues('landUseTypes').includes('other') && (
                  <div className="mt-2">
                    <Input
                      placeholder="Please specify other land use type"
                      {...form.register('otherLandUse')}
                    />
                  </div>
                )}
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
                  checked={form.getValues('hasLivestock')}
                  onCheckedChange={(checked) => form.setValue('hasLivestock', checked as boolean)}
                />
                <Label htmlFor="has-livestock">Do you manage livestock?</Label>
              </div>

              {form.getValues('hasLivestock') && (
                <div className="space-y-4">
                  <Label>Animal Types and Quantities</Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {['cattle', 'sheep', 'goats', 'swine', 'poultry', 'horses', 'rabbits', 'bees'].map((animal) => (
                      <div key={animal} className="flex items-center space-x-2">
                        <Label className="w-20 capitalize">{animal}:</Label>
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={form.getValues('animalTypes')[animal] || ''}
                          onChange={(e) => handleAnimalTypeChange(animal, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <Label className="w-20">Other:</Label>
                      <Input
                        type="text"
                        placeholder="Specify type and quantity"
                        value={form.getValues('animalTypes')['other'] || ''}
                        onChange={(e) => handleAnimalTypeChange('other', e.target.value)}
                      />
                    </div>
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
                  checked={form.getValues('hasEnvironmentalPermits')}
                  onCheckedChange={(checked) => form.setValue('hasEnvironmentalPermits', checked as boolean)}
                />
                <Label htmlFor="env-permits">Do you hold any environmental permits?</Label>
              </div>

              {form.getValues('hasEnvironmentalPermits') && (
                <div className="space-y-2">
                  <Label>Upload Environmental Permits (PDF)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="env-docs" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-6 h-6 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-500">Upload environmental permits</p>
                      </div>
                      <input id="env-docs" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('envDocs')} />
                    </label>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tech-docs"
                  checked={form.watch('hasTechnicalDocs') || false}
                  onCheckedChange={(checked) => form.setValue('hasTechnicalDocs' as any, checked as boolean)}
                />
                <Label htmlFor="tech-docs">Do you have technical project documentation?</Label>
              </div>

              {form.watch('hasTechnicalDocs') && (
                <div className="space-y-2">
                  <Label>Upload Technical Project Documentation (PDF)</Label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="tech-docs-upload" className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        <Upload className="w-6 h-6 mb-2 text-gray-500" />
                        <p className="text-sm text-gray-500">Upload technical docs</p>
                      </div>
                      <input id="tech-docs-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload('techDocs')} />
                    </label>
                  </div>
                </div>
              )}
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
                      checked={form.getValues('subsidyInterests').includes(interest)}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange(form.getValues('subsidyInterests'), interest, checked as boolean, 'subsidyInterests')
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
                  {...form.register('otherSubsidyInterest')}
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
                    {...form.register('mobileNumber')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Language</Label>
                  <Select onValueChange={(value) => form.setValue('preferredLanguage', value)}>
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
                    checked={form.watch('gdprConsent')}
                    onCheckedChange={(checked) => form.setValue('gdprConsent', checked as boolean)}
                    required
                  />
                  <Label htmlFor="gdpr-consent">✅ I consent to GDPR data processing *</Label>
                </div>
                {form.formState.errors.gdprConsent && (
                  <p className="text-sm text-red-500">{form.formState.errors.gdprConsent.message}</p>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notification-consent"
                    checked={form.watch('notificationConsent')}
                    onCheckedChange={(checked) => form.setValue('notificationConsent', checked as boolean)}
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
            <Button type="submit" disabled={createFarmMutation.isPending}>
              {createFarmMutation.isPending ? 'Creating...' : 'Create Farm Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FarmCreationForm;
