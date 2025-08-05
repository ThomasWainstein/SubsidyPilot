/**
 * Farm Creation Form Sections Component
 * Provides form sections for farm creation and editing
 */

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FarmEditData } from '@/schemas/farmValidation';

interface FarmCreationFormSectionsProps {
  form: UseFormReturn<FarmEditData>;
  className?: string;
}

export const FarmCreationFormSections: React.FC<FarmCreationFormSectionsProps> = ({
  form,
  className
}) => {
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Farm Profile</CardTitle>
          <CardDescription>
            Basic information about your farm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Form sections will be implemented here</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FarmCreationFormSections;