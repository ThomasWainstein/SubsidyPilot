import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Save, 
  Send,
  ArrowLeft,
  ArrowRight,
  Eye
} from 'lucide-react';
import { DynamicFormField } from './DynamicFormField';
import { FormSection } from './FormSection';
import { FormNavigation } from './FormNavigation';
import { DocumentViewer } from './DocumentViewer';
import { useLanguage } from '@/contexts/LanguageContext';

export interface FormFieldSchema {
  id: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'currency';
  label: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helpText?: string;
  conditionalLogic?: {
    dependsOn: string;
    condition: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
  autoPopulate?: {
    source: 'profile' | 'farm' | 'document';
    field: string;
    confidence?: number;
  };
}

export interface FormSectionSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldSchema[];
  required: boolean;
  conditionalLogic?: {
    dependsOn: string;
    condition: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
}

export interface FormSchema {
  id: string;
  title: string;
  description: string;
  estimatedTime: number; // minutes
  sections: FormSectionSchema[];
  documents: Array<{
    id: string;
    title: string;
    required: boolean;
    type: string;
    description: string;
  }>;
  metadata: {
    country: string;
    language: string;
    originalPdfUrl?: string;
    generatedAt: string;
    version: string;
  };
}

interface DynamicFormGeneratorProps {
  formSchema: FormSchema;
  farmId?: string;
  onSubmit: (formData: any) => Promise<void>;
  onSaveDraft: (formData: any) => Promise<void>;
  initialData?: any;
  showOriginalPdf?: boolean;
}

export const DynamicFormGenerator: React.FC<DynamicFormGeneratorProps> = ({
  formSchema,
  farmId,
  onSubmit,
  onSaveDraft,
  initialData = {},
  showOriginalPdf = false
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      if (Object.keys(formData).length > 0 && !isSubmitting) {
        setIsSaving(true);
        try {
          await onSaveDraft(formData);
          setLastSaved(new Date());
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          setIsSaving(false);
        }
      }
    };

    const interval = setInterval(autoSave, 30000); // Auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [formData, onSaveDraft, isSubmitting]);

  // Calculate completion progress
  const completionProgress = useMemo(() => {
    const visibleSections = formSchema.sections.filter(section => 
      !section.conditionalLogic || evaluateCondition(section.conditionalLogic, formData)
    );
    
    const totalFields = visibleSections.reduce((sum, section) => {
      const visibleFields = section.fields.filter(field =>
        !field.conditionalLogic || evaluateCondition(field.conditionalLogic, formData)
      );
      return sum + visibleFields.length;
    }, 0);

    const completedFields = visibleSections.reduce((sum, section) => {
      const visibleFields = section.fields.filter(field =>
        !field.conditionalLogic || evaluateCondition(field.conditionalLogic, formData)
      );
      return sum + visibleFields.filter(field => formData[field.id]).length;
    }, 0);

    return totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
  }, [formSchema.sections, formData]);

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

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear field error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateSection = (sectionIndex: number): boolean => {
    const section = formSchema.sections[sectionIndex];
    const newErrors: Record<string, string> = {};

    section.fields.forEach(field => {
      if (field.conditionalLogic && !evaluateCondition(field.conditionalLogic, formData)) {
        return; // Skip validation for hidden fields
      }

      const value = formData[field.id];
      
      if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
        newErrors[field.id] = `${field.label} is required`;
      }

      if (value && field.validation) {
        const { min, max, pattern, message } = field.validation;
        
        if (min !== undefined && value.length < min) {
          newErrors[field.id] = message || `Minimum ${min} characters required`;
        }
        
        if (max !== undefined && value.length > max) {
          newErrors[field.id] = message || `Maximum ${max} characters allowed`;
        }
        
        if (pattern && !new RegExp(pattern).test(value)) {
          newErrors[field.id] = message || 'Invalid format';
        }
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateSection(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, formSchema.sections.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    // Validate all sections
    let isValid = true;
    for (let i = 0; i < formSchema.sections.length; i++) {
      if (!validateSection(i)) {
        isValid = false;
      }
    }

    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleSections = formSchema.sections.filter(section => 
    !section.conditionalLogic || evaluateCondition(section.conditionalLogic, formData)
  );

  const currentSection = visibleSections[currentStep];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Form Header */}
      <div className="bg-background border rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{formSchema.title}</h1>
            <p className="text-muted-foreground mt-1">{formSchema.description}</p>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formSchema.estimatedTime} min
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {formSchema.sections.length} sections
              </Badge>
              {lastSaved && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  Saved {lastSaved.toLocaleTimeString()}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{Math.round(completionProgress)}%</span>
            </div>
            <Progress value={completionProgress} className="w-32" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Navigation */}
          <FormNavigation
            sections={visibleSections}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            completedSteps={[]} // TODO: Track completed steps
          />

          {/* Current Section */}
          {currentSection && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>Step {currentStep + 1}: {currentSection.title}</span>
                  {currentSection.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </CardTitle>
                {currentSection.description && (
                  <p className="text-muted-foreground">{currentSection.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <FormSection
                  section={currentSection}
                  formData={formData}
                  errors={errors}
                  onChange={handleFieldChange}
                />

                {/* Section Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onSaveDraft(formData)}
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>

                    {currentStep < visibleSections.length - 1 ? (
                      <Button
                        onClick={handleNext}
                        className="flex items-center gap-2"
                      >
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Original PDF Viewer */}
          {showOriginalPdf && formSchema.metadata.originalPdfUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Original Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentViewer
                  documentUrl={formSchema.metadata.originalPdfUrl}
                  currentSection={currentSection?.id}
                />
              </CardContent>
            </Card>
          )}

          {/* Document Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {formSchema.documents.map(doc => (
                  <div key={doc.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.title}</span>
                        {doc.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Help and Support */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Having trouble with this form? Our AI assistant can help guide you through each step.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full">
                Get Help
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};