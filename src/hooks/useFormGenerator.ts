import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FormSchema } from '@/components/forms/DynamicFormGenerator';

interface UseFormGeneratorResult {
  formSchema: FormSchema | null;
  isLoading: boolean;
  error: string | null;
  generateForm: (subsidyId: string, extractionId?: string) => Promise<void>;
  submitApplication: (formData: any, subsidyId: string, farmId?: string) => Promise<string | null>;
  saveDraft: (formData: any, subsidyId: string, farmId?: string) => Promise<string | null>;
  loadDraft: (subsidyId: string, farmId?: string) => Promise<any>;
}

export const useFormGenerator = (): UseFormGeneratorResult => {
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateForm = useCallback(async (subsidyId: string, extractionId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call the form generation edge function
      const { data, error: functionError } = await supabase.functions.invoke('generate-application-form', {
        body: {
          subsidyId,
          extractionId
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Form generation failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Form generation failed');
      }

      setFormSchema(data.formSchema);

      toast({
        title: "Form Generated Successfully",
        description: `Generated interactive form with ${data.formSchema.sections.length} sections`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Form Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const submitApplication = useCallback(async (
    formData: any, 
    subsidyId: string, 
    farmId?: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          subsidy_id: subsidyId,
          farm_id: farmId,
          notes: JSON.stringify(formData),
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      // Also call the submission processing function
      const { error: submissionError } = await supabase.functions.invoke('process-application-submission', {
        body: {
          applicationId: data.id,
          subsidyId,
          farmId,
          formData
        }
      });

      if (submissionError) {
        console.error('Submission processing error:', submissionError);
        // Don't throw here as the application was already saved
      }

      toast({
        title: "Application Submitted Successfully",
        description: "Your application has been submitted for processing",
      });

      return data.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Submission failed';
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [toast]);

  const saveDraft = useCallback(async (
    formData: any, 
    subsidyId: string, 
    farmId?: string
  ): Promise<string | null> => {
    try {
      // Check if draft already exists
      const { data: existingDraft } = await supabase
        .from('applications')
        .select('id')
        .eq('subsidy_id', subsidyId)
        .eq('farm_id', farmId || null)
        .eq('status', 'draft')
        .single();

      let result;
      if (existingDraft) {
        // Update existing draft
        const { data, error } = await supabase
          .from('applications')
          .update({
            notes: JSON.stringify(formData),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingDraft.id)
          .select('id')
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('applications')
          .insert({
            subsidy_id: subsidyId,
            farm_id: farmId,
            notes: JSON.stringify(formData),
            status: 'draft'
          })
          .select('id')
          .single();

        if (error) throw error;
        result = data;
      }

      return result.id;
    } catch (error) {
      console.error('Draft save error:', error);
      throw error;
    }
  }, []);

  const loadDraft = useCallback(async (subsidyId: string, farmId?: string): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('notes')
        .eq('subsidy_id', subsidyId)
        .eq('farm_id', farmId || null)
        .eq('status', 'draft')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return data?.notes ? JSON.parse(data.notes) : {};
    } catch (error) {
      console.error('Draft load error:', error);
      return {};
    }
  }, []);

  return {
    formSchema,
    isLoading,
    error,
    generateForm,
    submitApplication,
    saveDraft,
    loadDraft
  };
};