
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, X, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useUpdateFarm, useFarm } from '@/hooks/useFarms';
import { farmEditSchema, type FarmEditData } from '@/schemas/farmValidation';
import { countries } from '@/schemas/farmValidation';

interface FarmEditFormProps {
  farmId: string;
}

const FarmEditForm = ({ farmId }: FarmEditFormProps) => {
  const navigate = useNavigate();
  const { data: farm, isLoading } = useFarm(farmId);
  const updateMutation = useUpdateFarm();

  const form = useForm<FarmEditData>({
    resolver: zodResolver(farmEditSchema),
    defaultValues: {
      name: farm?.name || '',
      address: farm?.address || '',
      legal_status: farm?.legal_status || '',
      cnp_or_cui: farm?.cnp_or_cui || '',
      country: farm?.country || '',
      department: farm?.department || '',
      locality: farm?.locality || '',
      total_hectares: farm?.total_hectares || undefined,
      own_or_lease: farm?.own_or_lease || false,
      land_use_types: farm?.land_use_types || [],
      livestock_present: farm?.livestock_present || false,
      livestock: (farm?.livestock && typeof farm.livestock === 'object' && !Array.isArray(farm.livestock)) 
        ? farm.livestock as { [x: string]: any } 
        : {},
      irrigation_method: farm?.irrigation_method || '',
      certifications: farm?.certifications || [],
      environmental_permit: farm?.environmental_permit || false,
      tech_docs: farm?.tech_docs || false,
      subsidy_interest: farm?.subsidy_interest || [],
      phone: farm?.phone || '',
      preferred_language: farm?.preferred_language || 'en',
      revenue: farm?.revenue || '',
      software_used: farm?.software_used || [],
      staff_count: farm?.staff_count || 0,
    },
  });

  React.useEffect(() => {
    if (farm) {
      form.reset({
        name: farm.name,
        address: farm.address,
        legal_status: farm.legal_status || '',
        cnp_or_cui: farm.cnp_or_cui || '',
        country: farm.country || '',
        department: farm.department || '',
        locality: farm.locality || '',
        total_hectares: farm.total_hectares || undefined,
        own_or_lease: farm.own_or_lease || false,
        land_use_types: farm.land_use_types || [],
        livestock_present: farm.livestock_present || false,
        livestock: (farm.livestock && typeof farm.livestock === 'object' && !Array.isArray(farm.livestock)) 
          ? farm.livestock as { [x: string]: any } 
          : {},
        irrigation_method: farm.irrigation_method || '',
        certifications: farm.certifications || [],
        environmental_permit: farm.environmental_permit || false,
        tech_docs: farm.tech_docs || false,
        subsidy_interest: farm.subsidy_interest || [],
        phone: farm.phone || '',
        preferred_language: farm.preferred_language || 'en',
        revenue: farm.revenue || '',
        software_used: farm.software_used || [],
        staff_count: farm.staff_count || 0,
      });
    }
  }, [farm, form]);

  const onSubmit = async (data: FarmEditData) => {
    try {
      await updateMutation.mutateAsync({
        id: farmId,
        ...data,
      });
      navigate(`/farm/${farmId}`);
    } catch (error) {
      console.error('Failed to update farm:', error);
    }
  };

  const handleCancel = () => {
    navigate(`/farm/${farmId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading farm data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Farm</h1>
          <p className="text-gray-600 dark:text-gray-400">Update your farm information</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Farm Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter farm name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="legal_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Status</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., LLC, Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cnp_or_cui"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNP/CUI</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter CNP or CUI" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department/State</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="locality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Locality/City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter locality" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Farm Details */}
            <Card>
              <CardHeader>
                <CardTitle>Farm Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_hectares"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Hectares</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter total hectares" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="staff_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staff Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Number of staff members" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="own_or_lease"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Own the land (uncheck if leasing)</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="livestock_present"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Livestock present on farm</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="irrigation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Irrigation Method</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Drip, Sprinkler" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="revenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Revenue</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., €100,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Permits and Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Permits & Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="environmental_permit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Environmental permits obtained</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tech_docs"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Technical documentation available</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact & Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferred_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ro">Romanian</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="pl">Polish</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default FarmEditForm;
