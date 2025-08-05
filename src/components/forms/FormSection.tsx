import React from 'react';
import { DynamicFormField } from './DynamicFormField';
import { FormSectionSchema } from './DynamicFormGenerator';

interface FormSectionProps {
  section: FormSectionSchema;
  formData: any;
  errors: Record<string, string>;
  onChange: (fieldId: string, value: any) => void;
  farmData?: any;
}

export const FormSection: React.FC<FormSectionProps> = ({
  section,
  formData,
  errors,
  onChange,
  farmData
}) => {
  const evaluateCondition = (logic: any, data: any): boolean => {
    const fieldValue = data[logic.dependsOn];
    switch (logic.condition) {
      case 'equals':
        return fieldValue === logic.value;
      case 'not_equals':
        return fieldValue !== logic.value;
      case 'contains':
        return fieldValue && fieldValue.includes(logic.value);
      default:
        return true;
    }
  };

  const visibleFields = section.fields.filter(field =>
    !field.conditionalLogic || evaluateCondition(field.conditionalLogic, formData)
  );

  return (
    <div className="space-y-6">
      {visibleFields.map(field => (
        <DynamicFormField
          key={field.id}
          field={field}
          value={formData[field.id]}
          error={errors[field.id]}
          onChange={(value) => onChange(field.id, value)}
          farmData={farmData}
        />
      ))}
    </div>
  );
};