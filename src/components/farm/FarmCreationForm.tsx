
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
import { useCreateFarm } from '@/hooks/useFarms';
import { farmCreationSchema, type FarmCreationData, countries, departmentsByCountry } from '@/schemas/farmValidation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/hooks/use-toast';
import FileUploadField from '@/components/form/FileUploadField';

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
      country: '',
      department: '',
      locality: '',
      apiaRegions: [],
      landOwnership: '',
      totalArea: '',
      landUseTypes: [],
      hasLivestock: false,
      animalTypes: {},
      hasEnvironmentalPermits: false,
      hasTechnicalDocs: false,
      subsidyInterests: [],
      otherSubsidyInterest: '',
      mobileNumber: '',
      preferredLanguage: '',
      gdprConsent: false,
      notificationConsent: false,
      revenue: '',
      staff: '',
      certifications: [],
      irrigationMethod: '',
      software: [],
      uploadedFiles: {},
    },
  });

  const selectedCountry = form.watch('country');
  const availableDepartments = selectedCountry ? departmentsByCountry[selectedCountry] || [] : [];

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
        country: data.country,
        department: data.department,
        locality: data.locality,
        apia_region: data.apiaRegions,
        own_or_lease: data.landOwnership === 'own',
        total_hectares: data.totalArea ? parseFloat(data.totalArea) : null,
        land_use_types: data.landUseTypes,
        livestock_present: data.hasLivestock,
        livestock: data.hasLivestock ? data.animalTypes : null,
        environmental_permit: data.hasEnvironmentalPermits,
        tech_docs: data.hasTechnicalDocs,
        subsidy_interest: [...data.subsidyInterests, data.otherSubsidyInterest].filter(Boolean),
        phone: data.mobileNumber,
        preferred_language: data.preferredLanguage,
        gdpr_consent: data.gdprConsent,
        notify_consent: data.notificationConsent,
        revenue: data.revenue,
        staff_count: data.staff ? parseInt(data.staff) : null,
        certifications: data.certifications,
        irrigation_method: data.irrigationMethod,
        software_used: data.software,
      };

      console.log('Submitting farm data to Supabase:', farmData);
      const createdFarm = await createFarmMutation.mutateAsync(farmData);
      console.log('Farm created successfully:', createdFarm);
      
      toast({
        title: 'Success',
        description: 'Farm profile created successfully!',
      });
      
      // Navigate to the farm profile
      navigate(`/farm/${createdFarm.id}`, { replace: true });
    } catch (error: any) {
      console.error('Error creating farm:', error);
      toast({
        title: 'Error',
        description: `Failed to create farm: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (fieldName: string) => (file: File | null) => {
    if (file) {
      console.log(`File selected for ${fieldName}:`, file.name);
      
      // Update upload state
      form.setValue(`uploadedFiles.${fieldName}`, {
        filename: file.name,
        uploaded: true,
      });
      
      toast({
        title: 'File Selected',
        description: `File ${file.name} selected for ${fieldName}. Upload functionality will be implemented.`,
      });
    } else {
      // Remove upload state
      const currentFiles = form.getValues('uploadedFiles');
      delete currentFiles[fieldName];
      form.setValue('uploadedFiles', currentFiles);
    }
  };

  const handleCheckboxArrayChange = (field: keyof FarmCreationData, item: string, checked: boolean) => {
    const currentArray = form.getValues(field as any) as string[] || [];
    let newArray: string[];
    
    if (checked) {
      newArray = currentArray.includes(item) ? currentArray : [...currentArray, item];
    } else {
      newArray = currentArray.filter(i => i !== item);
    }
    
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
              <CardTitle>Section 1: Farm Identity & Legal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="farm-name">Farm Name *</Label>
                <Input
                  id="farm-name"
                  type="text"
                  placeholder="Enter your farm or business name"
                  {...form.register('farmName')}
                />
                {form.formState.errors.farmName && (
                  <p className="text-sm text-red-500">{form.formState.errors.farmName.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm-address">Complete Farm Address *</Label>
                <Textarea
                  id="farm-address"
                  placeholder="Enter complete farm address including street, city, postal code"
                  {...form.register('farmAddress')}
                />
                {form.formState.errors.farmAddress && (
                  <p className="text-sm text-red-500">{form.formState.errors.farmAddress.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legal-status">Legal Status *</Label>
                  <Select 
                    value={form.watch('legalStatus') || ''} 
                    onValueChange={(value) => form.setValue('legalStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select legal entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual Farmer</SelectItem>
                      <SelectItem value="srl">Limited Liability Company (SRL)</SelectItem>
                      <SelectItem value="cooperative">Agricultural Cooperative</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.legalStatus && (
                    <p className="text-sm text-red-500">{form.formState.errors.legalStatus.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnp-cui">Tax Identification Number *</Label>
                  <Input
                    id="cnp-cui"
                    type="text"
                    placeholder="CNP (individuals) or CUI/VAT number (companies)"
                    {...form.register('cnpOrCui')}
                  />
                  {form.formState.errors.cnpOrCui && (
                    <p className="text-sm text-red-500">{form.formState.errors.cnpOrCui.message}</p>
                  )}
                </div>
              </div>

              <FileUploadField
                id="id-cert"
                label="Identity or Company Registration Document"
                description="Upload ID card, passport, or company registration certificate (PDF format)"
                accept=".pdf"
                required
                onFileSelect={handleFileUpload('idCert')}
                uploadedFile={form.watch('uploadedFiles.idCert')}
              />
            </CardContent>
          </Card>

          {/* Section 2: International Location */}
          <Card>
            <CardHeader>
              <CardTitle>Section 2: Farm Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select 
                    value={form.watch('country') || ''} 
                    onValueChange={(value) => {
                      form.setValue('country', value);
                      form.setValue('department', ''); // Reset department when country changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.country && (
                    <p className="text-sm text-red-500">{form.formState.errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department/Region</Label>
                  <Select 
                    value={form.watch('department') || ''} 
                    onValueChange={(value) => form.setValue('department', value)}
                    disabled={!selectedCountry || availableDepartments.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCountry ? "Select department" : "Select country first"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept.charAt(0).toUpperCase() + dept.slice(1).replace('-', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locality">Locality/Municipality</Label>
                  <Input
                    id="locality"
                    type="text"
                    placeholder="Enter city or municipality name"
                    {...form.register('locality')}
                  />
                </div>
              </div>

              {selectedCountry === 'RO' && (
                <div className="space-y-2">
                  <Label>APIA Operating Regions (Romania only - select all that apply)</Label>
                  <div className="grid md:grid-cols-3 gap-2">
                    {[
                      'North-East', 'South-East', 'South-Muntenia', 'South-West Oltenia',
                      'West', 'North-West', 'Center', 'Bucharest-Ilfov'
                    ].map((region) => (
                      <div key={region} className="flex items-center space-x-2">
                        <Checkbox
                          id={region}
                          checked={form.watch('apiaRegions')?.includes(region) || false}
                          onCheckedChange={(checked) => 
                            handleCheckboxArrayChange('apiaRegions', region, checked as boolean)
                          }
                        />
                        <Label htmlFor={region} className="text-sm">{region}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Land Use & Agricultural Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Section 3: Land Use & Agricultural Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Land Ownership Type</Label>
                  <Select 
                    value={form.watch('landOwnership') || ''} 
                    onValueChange={(value) => form.setValue('landOwnership', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ownership type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="own">Own the land</SelectItem>
                      <SelectItem value="lease">Lease the land</SelectItem>
                      <SelectItem value="both">Both owned and leased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total-area">Total Agricultural Area</Label>
                  <div className="flex">
                    <Input
                      id="total-area"
                      type="number"
                      placeholder="Enter area"
                      {...form.register('totalArea')}
                      className="rounded-r-none"
                    />
                    <div className="px-3 py-2 bg-gray-100 border border-l-0 rounded-r-md text-sm text-gray-600">
                      hectares
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Types of Agricultural Activities *</Label>
                <p className="text-sm text-gray-600">Select all types of crops and land use that apply to your farm</p>
                <div className="grid md:grid-cols-3 gap-2">
                  {[
                    { value: 'cereals', label: 'Cereals (wheat, corn, barley, etc.)' },
                    { value: 'vegetables', label: 'Vegetables' },
                    { value: 'vineyards', label: 'Vineyards' },
                    { value: 'fruit_orchards', label: 'Fruit Orchards' },
                    { value: 'pasture_grassland', label: 'Pasture & Grassland' },
                    { value: 'greenhouse_protected', label: 'Greenhouse/Protected Cultivation' },
                    { value: 'industrial_crops', label: 'Industrial Crops (sunflower, rapeseed)' },
                    { value: 'aromatic_medicinal_plants', label: 'Aromatic & Medicinal Plants' },
                    { value: 'fallow_land', label: 'Fallow Land' },
                    { value: 'mixed_use', label: 'Mixed Agricultural Use' },
                    { value: 'forestry_plots', label: 'Forestry Plots' },
                  ].map((landUse) => (
                    <div key={landUse.value} className="flex items-start space-x-2">
                      <Checkbox
                        id={landUse.value}
                        checked={form.watch('landUseTypes')?.includes(landUse.value) || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxArrayChange('landUseTypes', landUse.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={landUse.value} className="text-sm leading-5">
                        {landUse.label}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="other"
                      checked={form.watch('landUseTypes')?.includes('other') || false}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange('landUseTypes', 'other', checked as boolean)
                      }
                    />
                    <Label htmlFor="other" className="text-sm">Other (specify below)</Label>
                  </div>
                </div>
                {form.watch('landUseTypes')?.includes('other') && (
                  <div className="mt-2">
                    <Input
                      placeholder="Please specify other agricultural activities"
                      {...form.register('otherLandUse')}
                    />
                  </div>
                )}
                {form.formState.errors.landUseTypes && (
                  <p className="text-sm text-red-500">{form.formState.errors.landUseTypes.message}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Irrigation Method</Label>
                  <Select 
                    value={form.watch('irrigationMethod') || ''} 
                    onValueChange={(value) => form.setValue('irrigationMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select irrigation method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No irrigation</SelectItem>
                      <SelectItem value="drip">Drip irrigation</SelectItem>
                      <SelectItem value="sprinkler">Sprinkler system</SelectItem>
                      <SelectItem value="flood">Flood irrigation</SelectItem>
                      <SelectItem value="pivot">Center pivot</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff">Number of Farm Workers</Label>
                  <Input
                    id="staff"
                    type="number"
                    placeholder="Enter number of workers"
                    {...form.register('staff')}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <FileUploadField
                  id="land-docs"
                  label="Land Ownership or Lease Documents"
                  description="Upload ownership deeds or lease agreements (PDF format)"
                  onFileSelect={handleFileUpload('landDocs')}
                  uploadedFile={form.watch('uploadedFiles.landDocs')}
                />

                <FileUploadField
                  id="parcel-maps"
                  label="LPIS or Parcel Maps (Optional)"
                  description="Upload land parcel identification maps if available"
                  onFileSelect={handleFileUpload('parcelMaps')}
                  uploadedFile={form.watch('uploadedFiles.parcelMaps')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Livestock Management */}
          <Card>
            <CardHeader>
              <CardTitle>Section 4: Livestock Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-livestock"
                  checked={form.watch('hasLivestock')}
                  onCheckedChange={(checked) => form.setValue('hasLivestock', checked as boolean)}
                />
                <Label htmlFor="has-livestock">Do you manage livestock on your farm?</Label>
              </div>

              {form.watch('hasLivestock') && (
                <div className="space-y-4">
                  <Label>Animal Types and Quantities</Label>
                  <p className="text-sm text-gray-600">Enter the number of animals for each type you manage</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { key: 'cattle', label: 'Cattle (cows, bulls)' },
                      { key: 'sheep', label: 'Sheep' },
                      { key: 'goats', label: 'Goats' },
                      { key: 'swine', label: 'Swine (pigs)' },
                      { key: 'poultry', label: 'Poultry (chickens, ducks)' },
                      { key: 'horses', label: 'Horses' },
                      { key: 'rabbits', label: 'Rabbits' },
                      { key: 'bees', label: 'Bee colonies' }
                    ].map((animal) => (
                      <div key={animal.key} className="flex items-center space-x-2">
                        <Label className="w-32 text-sm">{animal.label}:</Label>
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={form.watch('animalTypes')[animal.key] || ''}
                          onChange={(e) => handleAnimalTypeChange(animal.key, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <Label className="w-32 text-sm">Other:</Label>
                      <Input
                        type="text"
                        placeholder="Specify type and quantity"
                        value={form.watch('animalTypes')['other'] || ''}
                        onChange={(e) => handleAnimalTypeChange('other', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <FileUploadField
                    id="animal-docs"
                    label="Livestock Registration Documents"
                    description="Upload ANSVSA registration or animal movement logs (PDF format)"
                    onFileSelect={handleFileUpload('animalDocs')}
                    uploadedFile={form.watch('uploadedFiles.animalDocs')}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 5: Environmental & Technical Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Section 5: Environmental & Technical Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="env-permits"
                    checked={form.watch('hasEnvironmentalPermits')}
                    onCheckedChange={(checked) => form.setValue('hasEnvironmentalPermits', checked as boolean)}
                  />
                  <Label htmlFor="env-permits">Do you hold environmental permits or certifications?</Label>
                </div>

                {form.watch('hasEnvironmentalPermits') && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Environmental Certifications</Label>
                      <div className="grid md:grid-cols-2 gap-2">
                        {['Organic', 'Integrated Pest Management', 'Good Agricultural Practices', 'ISO 14001', 'Other'].map((cert) => (
                          <div key={cert} className="flex items-center space-x-2">
                            <Checkbox
                              id={cert}
                              checked={form.watch('certifications')?.includes(cert) || false}
                              onCheckedChange={(checked) => 
                                handleCheckboxArrayChange('certifications', cert, checked as boolean)
                              }
                            />
                            <Label htmlFor={cert} className="text-sm">{cert}</Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <FileUploadField
                      id="env-docs"
                      label="Environmental Permits and Certificates"
                      description="Upload environmental permits or certification documents"
                      onFileSelect={handleFileUpload('envDocs')}
                      uploadedFile={form.watch('uploadedFiles.envDocs')}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tech-docs"
                    checked={form.watch('hasTechnicalDocs')}
                    onCheckedChange={(checked) => form.setValue('hasTechnicalDocs', checked as boolean)}
                  />
                  <Label htmlFor="tech-docs">Do you have technical project documentation or investment plans?</Label>
                </div>

                {form.watch('hasTechnicalDocs') && (
                  <FileUploadField
                    id="tech-docs-upload"
                    label="Technical Project Documentation"
                    description="Upload technical project plans, investment documentation, or feasibility studies"
                    onFileSelect={handleFileUpload('techDocs')}
                    uploadedFile={form.watch('uploadedFiles.techDocs')}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 6: Subsidy Interests & Support Needs */}
          <Card>
            <CardHeader>
              <CardTitle>Section 6: Subsidy Interests & Support Needs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Which types of agricultural support are you interested in?</Label>
                <p className="text-sm text-gray-600">Select all subsidy categories that match your farm's needs and development plans</p>
              </div>

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
                      checked={form.watch('subsidyInterests')?.includes(interest) || false}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange('subsidyInterests', interest, checked as boolean)
                      }
                    />
                    <Label htmlFor={interest} className="text-sm">{interest}</Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="other-subsidy">Other Support Interests</Label>
                <Input
                  id="other-subsidy"
                  type="text"
                  placeholder="Specify any other subsidy or support interests not listed above"
                  {...form.register('otherSubsidyInterest')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue">Annual Farm Revenue (Optional)</Label>
                <Select 
                  value={form.watch('revenue') || ''} 
                  onValueChange={(value) => form.setValue('revenue', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select revenue range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-50k">Under €50,000</SelectItem>
                    <SelectItem value="50k-100k">€50,000 - €100,000</SelectItem>
                    <SelectItem value="100k-250k">€100,000 - €250,000</SelectItem>
                    <SelectItem value="250k-500k">€250,000 - €500,000</SelectItem>
                    <SelectItem value="over-500k">Over €500,000</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 7: Contact Information & Digital Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Section 7: Contact Information & Digital Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Phone Number</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="Enter mobile number with country code"
                    {...form.register('mobileNumber')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Communication Language</Label>
                  <Select 
                    value={form.watch('preferredLanguage') || ''} 
                    onValueChange={(value) => form.setValue('preferredLanguage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ro">Romanian</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Farm Management Software (Optional)</Label>
                <p className="text-sm text-gray-600">What digital tools do you currently use for farm management?</p>
                <div className="grid md:grid-cols-3 gap-2">
                  {['Excel/Spreadsheets', 'Farm ERP system', 'Field mapping software', 'Financial software', 'IoT sensors', 'Drone technology', 'None', 'Other'].map((software) => (
                    <div key={software} className="flex items-center space-x-2">
                      <Checkbox
                        id={software}
                        checked={form.watch('software')?.includes(software) || false}
                        onCheckedChange={(checked) => 
                          handleCheckboxArrayChange('software', software, checked as boolean)
                        }
                      />
                      <Label htmlFor={software} className="text-sm">{software}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-gray-900">Privacy & Notifications</h4>
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="gdpr-consent"
                    checked={form.watch('gdprConsent')}
                    onCheckedChange={(checked) => form.setValue('gdprConsent', checked as boolean)}
                    required
                  />
                  <Label htmlFor="gdpr-consent" className="text-sm leading-5">
                    <span className="text-red-500">*</span> I consent to the processing of my personal data in accordance with GDPR regulations for the purpose of farm profile management and subsidy matching services
                  </Label>
                </div>
                {form.formState.errors.gdprConsent && (
                  <p className="text-sm text-red-500">{form.formState.errors.gdprConsent.message}</p>
                )}

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="notification-consent"
                    checked={form.watch('notificationConsent')}
                    onCheckedChange={(checked) => form.setValue('notificationConsent', checked as boolean)}
                  />
                  <Label htmlFor="notification-consent" className="text-sm leading-5">
                    I want to receive notifications about subsidy deadlines, new funding opportunities, and important updates relevant to my farm
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4 pb-8">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button type="submit" disabled={createFarmMutation.isPending} className="min-w-[200px]">
              {createFarmMutation.isPending ? 'Creating Farm Profile...' : 'Create Farm Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FarmCreationForm;
