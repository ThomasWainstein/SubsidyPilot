import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SchemaExtractionStatus {
  status: 'not_extracted' | 'processing' | 'completed' | 'failed';
  extractionId?: string;
  schema?: any;
  fieldCount?: number;
  coveragePercentage?: number;
  error?: string;
  lastUpdated?: string;
}

interface UseSchemaExtractionResult {
  extractionStatus: SchemaExtractionStatus;
  isLoading: boolean;
  extractSchema: (subsidyId: string, forceExtraction?: boolean) => Promise<void>;
  refreshStatus: (subsidyId: string) => Promise<void>;
}

export const useSchemaExtraction = (): UseSchemaExtractionResult => {
  const [extractionStatus, setExtractionStatus] = useState<SchemaExtractionStatus>({
    status: 'not_extracted'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const refreshStatus = useCallback(async (subsidyId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_extraction_status')
        .select('*')
        .eq('subsidy_id', subsidyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching extraction status:', error);
        setExtractionStatus({ status: 'not_extracted' });
        return;
      }

      if (!data) {
        setExtractionStatus({ status: 'not_extracted' });
        return;
      }

      const status: SchemaExtractionStatus = {
        status: data.extraction_status as any,
        extractionId: data.id,
        schema: data.extracted_schema,
        fieldCount: data.field_count,
        coveragePercentage: data.coverage_percentage,
        error: data.extraction_errors?.[0]?.error || undefined,
        lastUpdated: data.updated_at
      };

      setExtractionStatus(status);
    } catch (error) {
      console.error('Error refreshing extraction status:', error);
      setExtractionStatus({ status: 'not_extracted' });
    }
  }, []);

  const extractSchema = useCallback(async (subsidyId: string, forceExtraction = false) => {
    setIsLoading(true);
    
    try {
      // Update status to processing immediately
      setExtractionStatus(prev => ({ ...prev, status: 'processing' }));
      
      toast({
        title: "Schema Extraction Started",
        description: "Extracting form schema from subsidy documents...",
      });

      const { data, error } = await supabase.functions.invoke('extract-document-schema', {
        body: {
          subsidyId,
          forceExtraction
        }
      });

      if (error) {
        throw new Error(error.message || 'Schema extraction failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Schema extraction failed');
      }

      // Update status with results
      setExtractionStatus({
        status: 'completed',
        extractionId: data.extractionId,
        schema: data.schema,
        fieldCount: data.metrics?.field_count,
        coveragePercentage: data.metrics?.coverage_percentage,
        lastUpdated: new Date().toISOString()
      });

      toast({
        title: "Schema Extraction Complete",
        description: `Successfully extracted ${data.metrics?.field_count || 0} form fields (${data.metrics?.coverage_percentage || 0}% coverage)`,
      });

    } catch (error) {
      console.error('Schema extraction error:', error);
      
      setExtractionStatus(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));

      toast({
        title: "Schema Extraction Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    extractionStatus,
    isLoading,
    extractSchema,
    refreshStatus
  };
};