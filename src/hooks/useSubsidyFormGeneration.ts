import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox' | 'file' | 'radio';
  required: boolean;
  placeholder?: string;
  description?: string;
  options?: string[]; // For select/radio fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    fileTypes?: string[];
    maxFileSize?: number;
  };
  defaultValue?: string | number | boolean;
  conditional?: {
    dependsOn: string;
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

export interface SubsidyFormSchema {
  id: string;
  subsidyId: string;
  title: string;
  description?: string;
  sections: FormSection[];
  metadata: {
    extractedFrom?: string;
    generatedAt: string;
    version: string;
    confidenceScore?: number;
  };
}

export interface SubsidyFormData {
  [fieldName: string]: any;
}

export const useSubsidyFormGeneration = () => {
  const [forms, setForms] = useState<SubsidyFormSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate form schema from extracted subsidy data
  const generateFormFromSubsidy = useCallback(async (subsidyId: string): Promise<SubsidyFormSchema | null> => {
    logger.debug('Generating form from subsidy', { subsidyId });
    
    try {
      setLoading(true);
      setError(null);

      // Fetch subsidy data
      const { data: subsidy, error: subsidyError } = await supabase
        .from('subsidies_structured')
        .select('*')
        .eq('id', subsidyId)
        .single();

      if (subsidyError) {
        throw new Error(`Failed to fetch subsidy: ${subsidyError.message}`);
      }

      if (!subsidy) {
        throw new Error('Subsidy not found');
      }

      // Generate form schema based on extracted requirements
      const formSchema = await generateFormSchema(subsidy);
      
      // Store the generated form schema
      const { data: savedForm, error: saveError } = await supabase
        .from('subsidy_form_schemas')
        .upsert({
          subsidy_id: subsidyId,
          schema: formSchema,
          version: formSchema.metadata.version,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving form schema:', saveError);
        // Continue anyway - we can still return the generated schema
      }

      logger.debug('Form schema generated successfully', { subsidyId, sections: formSchema.sections.length });
      
      toast({
        title: 'Form Generated',
        description: `Application form created for ${subsidy.title || 'subsidy program'}`,
      });

      return formSchema;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error generating form from subsidy:', err instanceof Error ? err : new Error(String(err)), { subsidyId });
      setError(errorMessage);
      
      toast({
        title: 'Form Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Generate form schema from subsidy data
  const generateFormSchema = async (subsidy: any): Promise<SubsidyFormSchema> => {
    const sections: FormSection[] = [];
    let sectionOrder = 1;

    // Section 1: Basic Application Information
    const basicSection: FormSection = {
      id: 'basic-info',
      title: 'Basic Application Information',
      description: 'Please provide your basic information for this application',
      order: sectionOrder++,
      fields: [
        {
          id: 'applicant_name',
          name: 'applicant_name',
          label: 'Applicant Name',
          type: 'text',
          required: true,
          placeholder: 'Full name of applicant'
        },
        {
          id: 'applicant_email',
          name: 'applicant_email',
          label: 'Email Address',
          type: 'email',
          required: true,
          placeholder: 'your.email@example.com'
        },
        {
          id: 'applicant_phone',
          name: 'applicant_phone',
          label: 'Phone Number',
          type: 'tel',
          required: false,
          placeholder: '+40 XXX XXX XXX'
        }
      ]
    };
    sections.push(basicSection);

    // Section 2: Farm Information (if applicable to agriculture)
    if (subsidy.sector?.some((s: string) => 
      s.toLowerCase().includes('agricult') || 
      s.toLowerCase().includes('farm') ||
      s.toLowerCase().includes('rural')
    )) {
      const farmSection: FormSection = {
        id: 'farm-info',
        title: 'Farm Information',
        description: 'Please provide details about your farm',
        order: sectionOrder++,
        fields: [
          {
            id: 'farm_name',
            name: 'farm_name',
            label: 'Farm Name',
            type: 'text',
            required: true,
            placeholder: 'Name of your farm or agricultural business'
          },
          {
            id: 'farm_address',
            name: 'farm_address',
            label: 'Farm Address',
            type: 'textarea',
            required: true,
            placeholder: 'Complete address of your farm'
          },
          {
            id: 'farm_size',
            name: 'farm_size',
            label: 'Farm Size (hectares)',
            type: 'number',
            required: true,
            validation: { min: 0 }
          },
          {
            id: 'legal_status',
            name: 'legal_status',
            label: 'Legal Status',
            type: 'select',
            required: true,
            options: ['Individual', 'SRL', 'Cooperative', 'Partnership', 'Other']
          }
        ]
      };
      sections.push(farmSection);
    }

    // Section 3: Project Details (based on program requirements)
    const projectSection: FormSection = {
      id: 'project-details',
      title: 'Project Details',
      description: 'Describe your project and how it meets the program requirements',
      order: sectionOrder++,
      fields: [
        {
          id: 'project_title',
          name: 'project_title',
          label: 'Project Title',
          type: 'text',
          required: true,
          placeholder: 'Brief title describing your project'
        },
        {
          id: 'project_description',
          name: 'project_description',
          label: 'Project Description',
          type: 'textarea',
          required: true,
          placeholder: 'Detailed description of your project, objectives, and expected outcomes'
        }
      ]
    };

    // Add funding amount field if range is available
    if (subsidy.amount && Array.isArray(subsidy.amount) && subsidy.amount.length > 0) {
      projectSection.fields.push({
        id: 'requested_amount',
        name: 'requested_amount',
        label: 'Requested Funding Amount (€)',
        type: 'number',
        required: true,
        validation: {
          min: subsidy.amount[0] || 0,
          max: subsidy.amount[1] || subsidy.amount[0]
        },
        description: `Amount must be between €${subsidy.amount[0]?.toLocaleString()} and €${subsidy.amount[1]?.toLocaleString() || subsidy.amount[0]?.toLocaleString()}`
      });
    }

    sections.push(projectSection);

    // Section 4: Required Documents (based on extracted requirements)
    if (subsidy.documents && Array.isArray(subsidy.documents) && subsidy.documents.length > 0) {
      const documentsSection: FormSection = {
        id: 'required-documents',
        title: 'Required Documents',
        description: 'Please upload all required documents for your application',
        order: sectionOrder++,
        fields: []
      };

      subsidy.documents.forEach((docType: string, index: number) => {
        documentsSection.fields.push({
          id: `document_${index}`,
          name: `document_${docType.toLowerCase().replace(/\s+/g, '_')}`,
          label: docType,
          type: 'file',
          required: true,
          validation: {
            fileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
            maxFileSize: 10 * 1024 * 1024 // 10MB
          },
          description: `Upload your ${docType.toLowerCase()}`
        });
      });

      sections.push(documentsSection);
    }

    // Section 5: Additional Requirements (based on application steps)
    if (subsidy.application_requirements && Array.isArray(subsidy.application_requirements)) {
      const requirementsSection: FormSection = {
        id: 'additional-requirements',
        title: 'Additional Requirements',
        description: 'Please complete the following requirements',
        order: sectionOrder++,
        fields: []
      };

      subsidy.application_requirements.forEach((req: any, index: number) => {
        if (req.step_description) {
          requirementsSection.fields.push({
            id: `requirement_${index}`,
            name: `requirement_${index}`,
            label: req.step_description,
            type: 'checkbox',
            required: true,
            description: 'Check to confirm you have completed this requirement'
          });
        }

        if (req.required_files && Array.isArray(req.required_files)) {
          req.required_files.forEach((file: string, fileIndex: number) => {
            requirementsSection.fields.push({
              id: `req_file_${index}_${fileIndex}`,
              name: `req_file_${file.toLowerCase().replace(/\s+/g, '_')}`,
              label: file,
              type: 'file',
              required: true,
              validation: {
                fileTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
                maxFileSize: 10 * 1024 * 1024
              }
            });
          });
        }
      });

      if (requirementsSection.fields.length > 0) {
        sections.push(requirementsSection);
      }
    }

    // Section 6: Declaration and Consent
    const declarationSection: FormSection = {
      id: 'declaration',
      title: 'Declaration and Consent',
      description: 'Please read and confirm the following declarations',
      order: sectionOrder++,
      fields: [
        {
          id: 'accuracy_declaration',
          name: 'accuracy_declaration',
          label: 'I declare that all information provided in this application is accurate and complete',
          type: 'checkbox',
          required: true
        },
        {
          id: 'eligibility_confirmation',
          name: 'eligibility_confirmation',
          label: 'I confirm that I meet all eligibility criteria for this program',
          type: 'checkbox',
          required: true
        },
        {
          id: 'data_processing_consent',
          name: 'data_processing_consent',
          label: 'I consent to the processing of my personal data for the purpose of this application',
          type: 'checkbox',
          required: true
        }
      ]
    };
    sections.push(declarationSection);

    const formSchema: SubsidyFormSchema = {
      id: `form_${subsidyId}_${Date.now()}`,
      subsidyId,
      title: `Application Form: ${subsidy.title || 'Subsidy Program'}`,
      description: subsidy.description || 'Complete this form to apply for the subsidy program',
      sections,
      metadata: {
        extractedFrom: subsidy.url || 'document',
        generatedAt: new Date().toISOString(),
        version: '1.0',
        confidenceScore: subsidy.audit?.confidence_scores ? 
          Object.values(subsidy.audit.confidence_scores).reduce((a: number, b: number) => a + b, 0) / 
          Object.values(subsidy.audit.confidence_scores).length : 
          undefined
      }
    };

    return formSchema;
  };

  // Load existing forms for a subsidy
  const loadSubsidyForms = useCallback(async (subsidyId: string) => {
    logger.debug('Loading forms for subsidy', { subsidyId });
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await supabase
        .from('subsidy_form_schemas')
        .select('*')
        .eq('subsidy_id', subsidyId)
        .order('created_at', { ascending: false });

      if (loadError) {
        throw new Error(`Failed to load forms: ${loadError.message}`);
      }

      const loadedForms = (data || []).map(row => ({
        ...row.schema,
        id: row.id
      }));

      setForms(loadedForms);
      return loadedForms;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error loading subsidy forms:', err instanceof Error ? err : new Error(String(err)), { subsidyId });
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Submit form data
  const submitForm = useCallback(async (formId: string, formData: SubsidyFormData, farmId?: string) => {
    logger.debug('Submitting form', { formId, farmId });
    
    try {
      setLoading(true);
      setError(null);

      const { data, error: submitError } = await supabase
        .from('subsidy_applications')
        .insert({
          form_id: formId,
          farm_id: farmId,
          form_data: formData,
          status: 'draft',
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (submitError) {
        throw new Error(`Failed to submit form: ${submitError.message}`);
      }

      logger.debug('Form submitted successfully', { applicationId: data.id });
      
      toast({
        title: 'Application Submitted',
        description: 'Your subsidy application has been submitted successfully',
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      logger.error('Error submitting form:', err instanceof Error ? err : new Error(String(err)), { formId });
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
  }, [toast]);

  return {
    forms,
    loading,
    error,
    generateFormFromSubsidy,
    loadSubsidyForms,
    submitForm,
  };
};

export default useSubsidyFormGeneration;