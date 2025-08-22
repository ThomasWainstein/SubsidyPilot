import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'file' | 'date' | 'radio' | 'multi-select';
  label: string;
  description?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  options?: string[];
  placeholder?: string;
  helpText?: string;
  conditionalLogic?: {
    showIf: string;
    value: any;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  order: number;
}

export interface ApplicationFormSchema {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  metadata: {
    subsidyId: string;
    clientType: string;
    estimatedTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    requiredDocuments: string[];
    generatedAt: string;
    version: string;
  };
}

export interface PreFillStatistics {
  totalFields: number;
  preFilledFields: number;
  completionPercentage: number;
  directMappings: number;
  aiGeneratedCount: number;
  mappedFields: string[];
  generatedFields: string[];
}

interface UseFormGenerationResult {
  formSchema: ApplicationFormSchema | null;
  formData: Record<string, any>;
  preFilledData: Record<string, any>;
  statistics: PreFillStatistics | null;
  isGenerating: boolean;
  isPreFilling: boolean;
  error: string | null;
  generateForm: (subsidyId: string, clientType: string, clientProfileId?: string) => Promise<ApplicationFormSchema | null>;
  preFillForm: (schema: ApplicationFormSchema, clientProfileId?: string, smartFillLevel?: 'basic' | 'comprehensive') => Promise<Record<string, any> | null>;
  updateFormData: (fieldId: string, value: any) => void;
  validateForm: () => { isValid: boolean; errors: Record<string, string> };
  clearForm: () => void;
}

export const useFormGeneration = (): UseFormGenerationResult => {
  const [formSchema, setFormSchema] = useState<ApplicationFormSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [preFilledData, setPreFilledData] = useState<Record<string, any>>({});
  const [statistics, setStatistics] = useState<PreFillStatistics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreFilling, setIsPreFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateForm = useCallback(async (
    subsidyId: string,
    clientType: string,
    clientProfileId?: string
  ): Promise<ApplicationFormSchema | null> => {
    if (!subsidyId || !clientType) {
      const errorMsg = 'Subsidy ID and client type are required';
      setError(errorMsg);
      toast({
        title: "Form Generation Error",
        description: errorMsg,
        variant: "destructive",
      });
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log('📝 Generating application form...', { subsidyId, clientType });
      
      const { data, error: generationError } = await supabase.functions.invoke('generate-form-schema', {
        body: {
          subsidyId,
          clientType,
          clientProfileId
        }
      });

      if (generationError) {
        throw new Error(generationError.message || 'Form generation failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Form generation failed');
      }

      const schema = data.formSchema as ApplicationFormSchema;
      setFormSchema(schema);

      // Initialize form data with empty values
      const initialFormData: Record<string, any> = {};
      schema.sections.forEach(section => {
        section.fields.forEach(field => {
          if (field.type === 'checkbox') {
            initialFormData[field.id] = false;
          } else if (field.type === 'multi-select') {
            initialFormData[field.id] = [];
          } else {
            initialFormData[field.id] = '';
          }
        });
      });
      setFormData(initialFormData);

      toast({
        title: "Form Generated",
        description: `Created application form with ${schema.sections.length} sections`,
      });

      console.log('✅ Form generation completed:', schema);
      return schema;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown form generation error';
      console.error('❌ Form generation failed:', err);
      
      setError(errorMessage);
      toast({
        title: "Form Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [toast]);

  const preFillForm = useCallback(async (
    schema: ApplicationFormSchema,
    clientProfileId?: string,
    smartFillLevel: 'basic' | 'comprehensive' = 'comprehensive'
  ): Promise<Record<string, any> | null> => {
    if (!schema) {
      const errorMsg = 'Form schema is required for pre-filling';
      setError(errorMsg);
      return null;
    }

    setIsPreFilling(true);
    setError(null);

    try {
      console.log('🎯 Pre-filling form...', { clientProfileId, smartFillLevel });
      
      const { data, error: preFillError } = await supabase.functions.invoke('prefill-form', {
        body: {
          formSchema: schema,
          clientProfileId,
          smartFillLevel
        }
      });

      if (preFillError) {
        throw new Error(preFillError.message || 'Form pre-fill failed');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Form pre-fill failed');
      }

      const preFilledFormData = data.formData as Record<string, any>;
      const stats = data.statistics as PreFillStatistics;
      
      setPreFilledData(preFilledFormData);
      setStatistics(stats);
      
      // Merge pre-filled data with existing form data
      setFormData(prev => ({
        ...prev,
        ...preFilledFormData
      }));

      toast({
        title: "Form Pre-filled",
        description: `${stats.completionPercentage}% of fields completed automatically`,
      });

      console.log('✅ Form pre-fill completed:', stats);
      return preFilledFormData;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown pre-fill error';
      console.error('❌ Form pre-fill failed:', err);
      
      setError(errorMessage);
      toast({
        title: "Pre-fill Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setIsPreFilling(false);
    }
  }, [toast]);

  const updateFormData = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  const validateForm = useCallback((): { isValid: boolean; errors: Record<string, string> } => {
    if (!formSchema) {
      return { isValid: false, errors: { form: 'No form schema available' } };
    }

    const errors: Record<string, string> = {};

    formSchema.sections.forEach(section => {
      section.fields.forEach(field => {
        const value = formData[field.id];
        
        // Required field validation
        if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
          errors[field.id] = `${field.label} is required`;
          return;
        }

        // Type-specific validation
        if (value && typeof value === 'string' && value.trim()) {
          const validation = field.validation;
          
          if (validation?.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
              errors[field.id] = `${field.label} format is invalid`;
            }
          }
          
          if (validation?.minLength && value.length < validation.minLength) {
            errors[field.id] = `${field.label} must be at least ${validation.minLength} characters`;
          }
          
          if (validation?.maxLength && value.length > validation.maxLength) {
            errors[field.id] = `${field.label} must be no more than ${validation.maxLength} characters`;
          }
          
          if (field.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors[field.id] = `${field.label} must be a valid email address`;
            }
          }
        }

        // Number validation
        if (field.type === 'number' && value !== '' && value !== null) {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors[field.id] = `${field.label} must be a valid number`;
          } else {
            if (field.validation?.min !== undefined && numValue < field.validation.min) {
              errors[field.id] = `${field.label} must be at least ${field.validation.min}`;
            }
            if (field.validation?.max !== undefined && numValue > field.validation.max) {
              errors[field.id] = `${field.label} must be no more than ${field.validation.max}`;
            }
          }
        }
      });
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [formSchema, formData]);

  const clearForm = useCallback(() => {
    setFormSchema(null);
    setFormData({});
    setPreFilledData({});
    setStatistics(null);
    setError(null);
  }, []);

  return {
    formSchema,
    formData,
    preFilledData,
    statistics,
    isGenerating,
    isPreFilling,
    error,
    generateForm,
    preFillForm,
    updateFormData,
    validateForm,
    clearForm,
  };
};