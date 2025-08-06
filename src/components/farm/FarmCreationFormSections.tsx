/**
 * Farm Creation Form Sections Component
 * Provides form sections for farm creation and editing
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { FarmEditData, countries } from '@/schemas/farmValidation';

interface FarmCreationFormSectionsProps {
  form: UseFormReturn<FarmEditData>;
  className?: string;
}

const legalStatusOptions = [
  { value: 'individual', label: 'Individual' },
  { value: 'srl', label: 'SRL (Limited Liability Company)' },
  { value: 'sa', label: 'SA (Joint Stock Company)' },
  { value: 'gmbh', label: 'GmbH (German Limited Liability)' },
  { value: 'sarl', label: 'SARL (French Limited Liability)' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'other', label: 'Other' }
];

const landUseOptions = [
  'arable_land',
  'permanent_grassland',
  'permanent_crops',
  'forest',
  'water_areas',
  'residential',
  'other'
];

const certificationOptions = [
  'organic',
  'iso_9001',
  'iso_14001',
  'globalgap',
  'brc',
  'ifs',
  'other'
];

export const FarmCreationFormSections: React.FC<FarmCreationFormSectionsProps> = ({
  form,
  className
}) => {
  const { register, control, setValue, watch } = form;
  const watchedFields = watch();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Fundamental details about your farm
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
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
              control={control}
              name="legal_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select legal status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {legalStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Farm Address</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter complete farm address"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.name}>
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
              control={control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department/Region</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter department" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="locality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Locality</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter locality" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="cnp_or_cui"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNP/CUI/Registration Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter registration number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
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
          </div>
        </CardContent>
      </Card>

      {/* Farm Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Farm Operations</CardTitle>
          <CardDescription>
            Details about your farming operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="total_hectares"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Hectares</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="Enter total hectares" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="staff_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Count</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter number of employees" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="revenue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Revenue</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter annual revenue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="irrigation_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Irrigation Method</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter irrigation method" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <FormField
              control={control}
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
                    <FormLabel>Own Land (vs. Lease)</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={control}
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
                    <FormLabel>Livestock Present</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={control}
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
                    <FormLabel>Environmental Permits</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={control}
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
                    <FormLabel>Technical Documentation Available</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>
            Language preferences and other details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="preferred_language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Language</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="ro">Romanian</SelectItem>
                    <SelectItem value="pl">Polish</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmCreationFormSections;