import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FileUploadField from '@/components/form/FileUploadField';
import { FormField, FormSection, SubsidyFormSchema, SubsidyFormData } from '@/hooks/useSubsidyFormGeneration';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface DynamicSubsidyFormProps {
  schema: SubsidyFormSchema;
  onSubmit: (formData: SubsidyFormData) => Promise<void>;
  farmId?: string;
  loading?: boolean;
  initialData?: Partial<SubsidyFormData>;
}

interface FileUploadState {
  [fieldName: string]: {
    file: File | null;
    uploaded: boolean;
    filename?: string;
  };
}

export const DynamicSubsidyForm: React.FC<DynamicSubsidyFormProps> = ({
  schema,
  onSubmit,
  farmId,
  loading = false,
  initialData = {}
}) => {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [fileUploads, setFileUploads] = useState<FileUploadState>({});
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SubsidyFormData>({
    defaultValues: initialData
  });

  const sortedSections = schema.sections.sort((a, b) => a.order - b.order);
  const currentSectionData = sortedSections[currentSection];
  const totalSections = sortedSections.length;
  const progress = ((currentSection + 1) / totalSections) * 100;

  // Calculate completion status for each section
  const getSectionCompletion = useCallback((section: FormSection): { completed: number; total: number } => {
    const watchedValues = watch();
    const requiredFields = section.fields.filter(field => field.required);
    const completedFields = requiredFields.filter(field => {
      const value = watchedValues[field.name];
      if (field.type === 'file') {
        return fileUploads[field.name]?.uploaded;
      }
      if (field.type === 'checkbox') {
        return value === true;
      }
      return value && value.toString().trim() !== '';
    });
    
    return {
      completed: completedFields.length,
      total: requiredFields.length
    };
  }, [watch, fileUploads]);

  // Render individual form field
  const renderField = useCallback((field: FormField) => {
    const error = errors[field.name];
    const commonProps = {
      id: field.id,
      ...register(field.name, { 
        required: field.required ? `${field.label} is required` : false,
        min: field.validation?.min,
        max: field.validation?.max,
        pattern: field.validation?.pattern ? {
          value: new RegExp(field.validation.pattern),
          message: `${field.label} format is invalid`
        } : undefined
      })
    };

    const fieldWrapper = (content: React.ReactNode) => (
      <div key={field.id} className="space-y-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {content}
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        {error && (
          <p className="text-xs text-red-500 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {typeof error === 'string' ? error : (error as any)?.message || 'Invalid input'}
          </p>
        )}
      </div>
    );

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return fieldWrapper(
          <Input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'number':
        return fieldWrapper(
          <Input
            {...commonProps}
            type="number"
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'date':
        return fieldWrapper(
          <Input
            {...commonProps}
            type="date"
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'textarea':
        return fieldWrapper(
          <Textarea
            {...commonProps}
            placeholder={field.placeholder}
            rows={4}
            className={error ? 'border-red-500' : ''}
          />
        );

      case 'select':
        return fieldWrapper(
          <Select
            onValueChange={(value) => setValue(field.name, value)}
            defaultValue={field.defaultValue as string}
          >
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
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

      case 'checkbox':
        return fieldWrapper(
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={watch(field.name) === true}
              onCheckedChange={(checked) => setValue(field.name, checked)}
              className={error ? 'border-red-500' : ''}
            />
            <Label
              htmlFor={field.id}
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
            </Label>
          </div>
        );

      case 'file':
        return fieldWrapper(
          <div className="space-y-2">
            <FileUploadField
              id={field.id}
              label=""
              description={field.description}
              accept={field.validation?.fileTypes?.map(type => `.${type}`).join(',')}
              required={field.required}
              onFileSelect={(file) => {
                setFileUploads(prev => ({
                  ...prev,
                  [field.name]: {
                    file,
                    uploaded: !!file,
                    filename: file?.name
                  }
                }));
                setValue(field.name, file?.name || '');
              }}
              uploadedFile={fileUploads[field.name]}
            />
            {field.validation?.fileTypes && (
              <p className="text-xs text-muted-foreground">
                Accepted formats: {field.validation.fileTypes.join(', ')}
                {field.validation.maxFileSize && 
                  ` (max ${(field.validation.maxFileSize / 1024 / 1024).toFixed(0)}MB)`
                }
              </p>
            )}
          </div>
        );

      case 'radio':
        return fieldWrapper(
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.id}_${option}`}
                  {...register(field.name, { required: field.required })}
                  value={option}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                />
                <Label htmlFor={`${field.id}_${option}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      default:
        return fieldWrapper(
          <Input
            {...commonProps}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        );
    }
  }, [register, setValue, watch, errors, fileUploads]);

  // Navigation handlers
  const goToNextSection = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const goToPreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const canProceedToNext = () => {
    const completion = getSectionCompletion(currentSectionData);
    return completion.completed === completion.total;
  };

  // Form submission
  const onFormSubmit = async (data: SubsidyFormData) => {
    logger.debug('Submitting dynamic subsidy form', { formId: schema.id, data });
    
    try {
      setSubmitting(true);
      
      // Include file upload data
      const formDataWithFiles = {
        ...data,
        files: fileUploads,
        metadata: {
          formId: schema.id,
          submittedAt: new Date().toISOString(),
          farmId
        }
      };
      
      await onSubmit(formDataWithFiles);
      
      toast({
        title: 'Application Submitted',
        description: 'Your subsidy application has been submitted successfully.',
      });
      
    } catch (error) {
      logger.error('Error submitting form:', error instanceof Error ? error : new Error(String(error)), { formId: schema.id });
      
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentSectionData) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No form sections found. Please check the form configuration.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Form Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{schema.title}</CardTitle>
              {schema.description && (
                <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>
              )}
            </div>
            {schema.metadata.confidenceScore && (
              <Badge variant="secondary">
                {Math.round(schema.metadata.confidenceScore * 100)}% confidence
              </Badge>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Section {currentSection + 1} of {totalSections}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Section Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {sortedSections.map((section, index) => {
              const completion = getSectionCompletion(section);
              const isComplete = completion.completed === completion.total;
              const isCurrent = index === currentSection;
              
              return (
                <Button
                  key={section.id}
                  variant={isCurrent ? 'default' : isComplete ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentSection(index)}
                  className="flex items-center space-x-1"
                >
                  {isComplete && <CheckCircle className="h-3 w-3" />}
                  <span>{section.title}</span>
                  <Badge variant="outline" className="ml-1">
                    {completion.completed}/{completion.total}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Section Form */}
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{currentSectionData.title}</span>
            </CardTitle>
            {currentSectionData.description && (
              <p className="text-sm text-muted-foreground">{currentSectionData.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {currentSectionData.fields.map(renderField)}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousSection}
                disabled={currentSection === 0}
              >
                Previous
              </Button>
              
              <div className="flex space-x-2">
                {currentSection < totalSections - 1 ? (
                  <Button
                    type="button"
                    onClick={goToNextSection}
                    disabled={!canProceedToNext()}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!canProceedToNext() || submitting || loading}
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                )}
              </div>
            </div>
            
            {!canProceedToNext() && currentSection < totalSections - 1 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please complete all required fields before proceeding to the next section.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default DynamicSubsidyForm;