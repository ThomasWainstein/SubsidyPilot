import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { FormField, FormSection } from '@/hooks/useFormGeneration';
import { Upload, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DynamicFormFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  isPreFilled?: boolean;
  className?: string;
}

const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  error,
  isPreFilled = false,
  className = ''
}) => {
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <RadioGroup value={value || ''} onValueChange={onChange}>
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value || false}
              onCheckedChange={onChange}
              id={field.id}
            />
            <Label htmlFor={field.id} className="text-sm">
              {field.description || 'I agree'}
            </Label>
          </div>
        );

      case 'multi-select':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  checked={(value || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValues = value || [];
                    if (checked) {
                      onChange([...currentValues, option]);
                    } else {
                      onChange(currentValues.filter((v: string) => v !== option));
                    }
                  }}
                  id={`${field.id}-${option}`}
                />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              Click to upload {field.label.toLowerCase()}
            </p>
            <Input
              type="file"
              onChange={(e) => onChange(e.target.files?.[0])}
              className="mt-2"
            />
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {isPreFilled && (
          <Badge variant="secondary" className="text-xs">
            Auto-filled
          </Badge>
        )}
        {field.helpText && (
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
              {field.helpText}
            </div>
          </div>
        )}
      </div>
      
      {field.description && (
        <p className="text-xs text-gray-600">{field.description}</p>
      )}
      
      {renderField()}
      
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

interface DynamicFormSectionProps {
  section: FormSection;
  formData: Record<string, any>;
  preFilledFields: string[];
  errors: Record<string, string>;
  onChange: (fieldId: string, value: any) => void;
  className?: string;
}

const DynamicFormSection: React.FC<DynamicFormSectionProps> = ({
  section,
  formData,
  preFilledFields,
  errors,
  onChange,
  className = ''
}) => {
  const completedFields = section.fields.filter(field => {
    const value = formData[field.id];
    return value && (typeof value !== 'string' || value.trim());
  }).length;

  const completionPercentage = Math.round((completedFields / section.fields.length) * 100);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {section.title}
              {completedFields === section.fields.length && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
            </CardTitle>
            {section.description && (
              <CardDescription>{section.description}</CardDescription>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{completedFields}/{section.fields.length}</div>
            <div className="text-xs text-gray-500">{completionPercentage}% complete</div>
          </div>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-6">
        {section.fields.map((field, index) => {
          // Check conditional logic
          if (field.conditionalLogic) {
            const conditionalValue = formData[field.conditionalLogic.showIf];
            if (conditionalValue !== field.conditionalLogic.value) {
              return null; // Hide field if condition not met
            }
          }

          return (
            <div key={field.id}>
              <DynamicFormField
                field={field}
                value={formData[field.id]}
                onChange={(value) => onChange(field.id, value)}
                error={errors[field.id]}
                isPreFilled={preFilledFields.includes(field.id)}
              />
              {index < section.fields.length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

interface DynamicFormRendererProps {
  formSchema: any;
  formData: Record<string, any>;
  preFilledFields: string[];
  errors: Record<string, string>;
  onChange: (fieldId: string, value: any) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  formSchema,
  formData,
  preFilledFields,
  errors,
  onChange,
  onSubmit,
  isSubmitting = false,
  className = ''
}) => {
  const [currentSection, setCurrentSection] = useState(0);

  if (!formSchema) {
    return (
      <Alert>
        <AlertDescription>
          No form schema available. Please generate a form first.
        </AlertDescription>
      </Alert>
    );
  }

  const totalFields = formSchema.sections.reduce((total: number, section: any) => 
    total + section.fields.length, 0);
  const completedFields = Object.keys(formData).filter(key => {
    const value = formData[key];
    return value && (typeof value !== 'string' || value.trim());
  }).length;
  const overallProgress = Math.round((completedFields / totalFields) * 100);

  const isFormValid = Object.keys(errors).length === 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Form Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{formSchema.title}</span>
            <Badge variant="outline">
              {formSchema.metadata.difficulty} • ~{formSchema.metadata.estimatedTime}min
            </Badge>
          </CardTitle>
          <CardDescription>{formSchema.description}</CardDescription>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{completedFields}/{totalFields} fields ({overallProgress}%)</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Required Documents Alert */}
      {formSchema.metadata.requiredDocuments.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-1">Required Documents:</div>
            <ul className="text-sm space-y-1">
              {formSchema.metadata.requiredDocuments.map((doc: string, i: number) => (
                <li key={i}>• {doc}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Sections */}
      <div className="space-y-6">
        {formSchema.sections.map((section: any, index: number) => (
          <DynamicFormSection
            key={section.id}
            section={section}
            formData={formData}
            preFilledFields={preFilledFields}
            errors={errors}
            onChange={onChange}
          />
        ))}
      </div>

      {/* Form Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isFormValid ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Form is ready to submit
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  Please fix validation errors
                </span>
              )}
            </div>
            <Button 
              onClick={onSubmit}
              disabled={!isFormValid || isSubmitting}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};