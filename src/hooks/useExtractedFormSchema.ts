import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { FormField, FormSection, SubsidyFormSchema, SubsidyFormData } from './useSubsidyFormGeneration';

export const useExtractedFormSchema = () => {
  const [schema, setSchema] = useState<SubsidyFormSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch extracted schema from database
  const fetchExtractedSchema = useCallback(async (subsidyId: string): Promise<SubsidyFormSchema | null> => {
    logger.debug('Fetching extracted schema for subsidy', { subsidyId });
    
    try {
      setLoading(true);
      setError(null);

      // Fetch the latest schema for this subsidy
      const { data: schemaData, error: schemaError } = await supabase
        .from('subsidy_form_schemas')
        .select('*')
        .eq('subsidy_id', subsidyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (schemaError) {
        throw new Error(`Failed to fetch schema: ${schemaError.message}`);
      }

      if (!schemaData) {
        logger.debug('No extracted schema found for subsidy', { subsidyId });
        return null;
      }

      // Convert extracted schema to our form format
      const formSchema = convertExtractedToFormSchema(schemaData, subsidyId);
      setSchema(formSchema);
      
      logger.debug('Extracted schema loaded successfully', { 
        subsidyId, 
        totalSections: formSchema.sections.length 
      });

      return formSchema;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error fetching extracted schema:', err instanceof Error ? err : new Error(String(err)), { subsidyId });
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convert extracted schema to our form schema format
  const convertExtractedToFormSchema = (schemaData: any, subsidyId: string): SubsidyFormSchema => {
    const extractedSchema = schemaData.schema;
    const sections: FormSection[] = [];
    let sectionOrder = 1;

    // Handle form_structure format (object of sections)
    if (extractedSchema.form_structure) {
      Object.entries(extractedSchema.form_structure).forEach(([sectionName, sectionFields]: [string, any]) => {
        if (typeof sectionFields === 'object' && !Array.isArray(sectionFields)) {
          const fields: FormField[] = [];
          
          Object.entries(sectionFields).forEach(([fieldName, fieldConfig]: [string, any]) => {
            if (typeof fieldConfig === 'object' && fieldConfig.type) {
              fields.push(convertFieldConfig(fieldName, fieldConfig));
            }
          });

          if (fields.length > 0) {
            sections.push({
              id: `section_${sectionOrder}`,
              title: sectionName,
              description: `Complete the ${sectionName} section`,
              fields,
              order: sectionOrder++
            });
          }
        }
      });
    }
    
    // Handle sections array format
    else if (extractedSchema.sections && Array.isArray(extractedSchema.sections)) {
      extractedSchema.sections.forEach((section: any) => {
        const fields: FormField[] = [];
        
        if (section.fields && Array.isArray(section.fields)) {
          section.fields.forEach((field: any) => {
            fields.push(convertFieldConfig(field.label || field.name, field));
          });
        }

        if (fields.length > 0) {
          sections.push({
            id: `section_${sectionOrder}`,
            title: section.section_name || section.title || `Section ${sectionOrder}`,
            description: section.description || `Complete the ${section.section_name || 'section'}`,
            fields,
            order: sectionOrder++
          });
        }
      });
    }

    return {
      id: schemaData.id,
      subsidyId,
      title: extractedSchema.documentTitle || `Application Form`,
      description: extractedSchema.description || 'Complete this form to apply for the subsidy program',
      sections,
      metadata: {
        extractedFrom: 'database',
        generatedAt: schemaData.created_at,
        version: schemaData.version || '1.0',
        confidenceScore: extractedSchema.extractionConfidence ? extractedSchema.extractionConfidence / 100 : undefined
      }
    };
  };

  // Convert field configuration from extracted schema to our format
  const convertFieldConfig = (fieldName: string, fieldConfig: any): FormField => {
    // Map field types
    const typeMapping: { [key: string]: FormField['type'] } = {
      'string': 'text',
      'text': 'text',
      'email': 'email',
      'tel': 'tel',
      'phone': 'tel',
      'number': 'number',
      'integer': 'number',
      'date': 'date',
      'textarea': 'textarea',
      'select': 'select',
      'dropdown': 'select',
      'checkbox': 'checkbox',
      'boolean': 'checkbox',
      'file': 'file',
      'radio': 'radio'
    };

    const fieldType = typeMapping[fieldConfig.type?.toLowerCase()] || 'text';
    
    return {
      id: `field_${fieldName.toLowerCase().replace(/\s+/g, '_')}`,
      name: fieldName.toLowerCase().replace(/\s+/g, '_'),
      label: fieldConfig.label || fieldName,
      type: fieldType,
      required: fieldConfig.required === true,
      placeholder: fieldConfig.placeholder || `Enter ${fieldName.toLowerCase()}`,
      description: fieldConfig.description,
      options: fieldConfig.options || fieldConfig.enum,
      validation: {
        min: fieldConfig.minLength || fieldConfig.min,
        max: fieldConfig.maxLength || fieldConfig.max,
        pattern: fieldConfig.pattern,
        fileTypes: fieldConfig.acceptedTypes || ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
        maxFileSize: fieldConfig.maxSize || 10 * 1024 * 1024 // 10MB default
      },
      defaultValue: fieldConfig.defaultValue
    };
  };

  // Submit application using extracted form
  const submitApplication = useCallback(async (
    formData: SubsidyFormData,
    farmId?: string
  ): Promise<string | null> => {
    if (!schema) {
      throw new Error('No schema available for submission');
    }

    logger.debug('Submitting application with extracted schema', { 
      formId: schema.id, 
      subsidyId: schema.subsidyId, 
      farmId 
    });
    
    try {
      setLoading(true);
      setError(null);

      // Save to subsidy_applications table
      const { data: application, error: applicationError } = await supabase
        .from('subsidy_applications')
        .insert({
          form_id: schema.id,
          farm_id: farmId || null,
          form_data: formData,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (applicationError) {
        throw new Error(`Failed to submit application: ${applicationError.message}`);
      }

      // Also create a record in the applications table for compatibility
      if (farmId) {
        await supabase
          .from('applications')
          .insert({
            farm_id: farmId,
            subsidy_id: schema.subsidyId,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            notes: `Application submitted using extracted form schema ${schema.id}`
          });
      }

      logger.debug('Application submitted successfully', { 
        applicationId: application.id,
        formId: schema.id 
      });
      
      toast({
        title: 'Application Submitted',
        description: 'Your subsidy application has been submitted successfully.',
      });

      return application.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error submitting application:', err instanceof Error ? err : new Error(String(err)), { 
        formId: schema?.id,
        subsidyId: schema?.subsidyId 
      });
      setError(errorMessage);
      
      toast({
        title: 'Submission Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [schema, toast]);

  // Load existing draft
  const loadExistingDraft = useCallback(async (farmId?: string): Promise<SubsidyFormData | null> => {
    if (!schema || !farmId) return null;

    try {
      const { data: draft } = await supabase
        .from('subsidy_applications')
        .select('form_data')
        .eq('form_id', schema.id)
        .eq('farm_id', farmId)
        .eq('status', 'draft')
        .maybeSingle();

      return (draft?.form_data as SubsidyFormData) || null;
    } catch (err) {
      logger.error('Error loading draft:', err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }, [schema]);

  // Save as draft
  const saveAsDraft = useCallback(async (
    formData: SubsidyFormData,
    farmId?: string
  ): Promise<string | null> => {
    if (!schema) {
      throw new Error('No schema available for saving draft');
    }

    try {
      setLoading(true);
      setError(null);

      // Check if draft already exists
      const { data: existingDraft } = await supabase
        .from('subsidy_applications')
        .select('id')
        .eq('form_id', schema.id)
        .eq('farm_id', farmId || '')
        .eq('status', 'draft')
        .maybeSingle();

      let result;
      if (existingDraft) {
        // Update existing draft
        const { data, error } = await supabase
          .from('subsidy_applications')
          .update({
            form_data: formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDraft.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('subsidy_applications')
          .insert({
            form_id: schema.id,
            farm_id: farmId || null,
            form_data: formData,
            status: 'draft'
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      toast({
        title: 'Draft Saved',
        description: 'Your application has been saved as a draft.',
      });

      return result.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error saving draft:', err instanceof Error ? err : new Error(String(err)));
      setError(errorMessage);
      
      toast({
        title: 'Save Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [schema, toast]);

  return {
    schema,
    loading,
    error,
    fetchExtractedSchema,
    submitApplication,
    saveAsDraft,
    loadExistingDraft,
  };
};