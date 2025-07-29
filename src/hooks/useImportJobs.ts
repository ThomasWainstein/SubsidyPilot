import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ImportJob, FieldMapping, validateImportData, detectDuplicates, autoMapFields } from '@/schemas/importValidation';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// File parsing utilities
const parseCSV = (text: string): Record<string, string>[] => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g, ''));
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/\"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return data;
};

const parseExcel = async (file: File): Promise<any[]> => {
  // For simplicity, we'll treat Excel as CSV for now
  // In production, you'd use a library like xlsx
  const text = await file.text();
  return parseCSV(text);
};

const parseJSON = (text: string): any[] => {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error('Invalid JSON format');
  }
};

export const useImportJobs = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);

  // Create import job
  const createImportJob = useCallback(async (
    file: File, 
    type: 'subsidies' | 'farms' | 'applications'
  ): Promise<ImportJob> => {
    let data: any[] = [];
    
    try {
      const fileType = file.name.split('.').pop()?.toLowerCase();
      const text = await file.text();
      
      switch (fileType) {
        case 'csv':
          data = parseCSV(text);
          break;
        case 'xlsx':
        case 'xls':
          data = await parseExcel(file);
          break;
        case 'json':
          data = parseJSON(text);
          break;
        default:
          throw new Error('Unsupported file format');
      }
      
      if (data.length === 0) {
        throw new Error('File is empty or could not be parsed');
      }
      
      const fields = Object.keys(data[0] || {});
      const autoMappings = autoMapFields(fields);
      
      const job: ImportJob = {
        id: uuidv4(),
        type,
        status: 'mapping',
        fileName: file.name,
        fileSize: file.size,
        totalRows: data.length,
        processedRows: 0,
        successRows: 0,
        errorRows: 0,
        fieldMappings: autoMappings,
        validationErrors: [],
        duplicates: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id || '',
      };
      
      setCurrentJob(job);
      setParsedData(data);
      setSourceFields(fields);
      
      return job;
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  // Update field mappings
  const updateFieldMappings = useCallback((mappings: FieldMapping[]) => {
    if (!currentJob) return;
    
    const updatedJob = {
      ...currentJob,
      fieldMappings: mappings,
      updated_at: new Date().toISOString(),
    };
    
    setCurrentJob(updatedJob);
  }, [currentJob]);

  // Validate data
  const validateData = useCallback(async () => {
    if (!currentJob || !parsedData.length) return;
    
    setCurrentJob(prev => prev ? { ...prev, status: 'validating' } : null);
    
    try {
      // Transform data based on field mappings
      const transformedData = parsedData.map(row => {
        const transformed: Record<string, unknown> = {};
        
        currentJob.fieldMappings.forEach(mapping => {
          if (mapping.canonicalField && row[mapping.sourceField] !== undefined) {
            let value = row[mapping.sourceField];
            
            // Apply transformations
            switch (mapping.transform) {
              case 'split_csv':
                value = typeof value === 'string' ? value.split(',').map(v => v.trim()) : value;
                break;
              case 'parse_json':
                try {
                  value = JSON.parse(value);
                } catch {
                  // Keep original value if JSON parse fails
                }
                break;
              case 'date_format':
                // Convert to ISO format
                if (value) {
                  const date = new Date(value);
                  value = isNaN(date.getTime()) ? value : date.toISOString();
                }
                break;
              case 'currency':
                // Remove currency symbols and convert to number
                if (typeof value === 'string') {
                  value = parseFloat(value.replace(/[^0-9.-]/g, ''));
                }
                break;
            }
            
            transformed[mapping.canonicalField] = value;
          }
        });
        
        // Generate code if not provided
        if (!transformed.code && transformed.title) {
          const titleStr = typeof transformed.title === 'string' ? transformed.title : String(transformed.title);
          transformed.code = titleStr.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20) + '-' + Date.now();
        }
        
        return transformed;
      });
      
      // Validate transformed data
      const validationErrors = validateImportData(transformedData, currentJob.type);
      
      // Check for duplicates
      const { data: existingData } = await supabase.from('subsidies').select('id, code, title, url');
      const duplicates = detectDuplicates(transformedData, existingData || [], ['code', 'url']);
      
      const updatedJob = {
        ...currentJob,
        status: validationErrors.some(e => e.severity === 'error') ? 'mapping' : 'reviewing',
        validationErrors,
        duplicates,
        updated_at: new Date().toISOString(),
      } as ImportJob;
      
      setCurrentJob(updatedJob);
      
      if (validationErrors.some(e => e.severity === 'error')) {
        toast({
          title: 'Validation Errors',
          description: `Found ${validationErrors.filter(e => e.severity === 'error').length} errors that must be fixed`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Validation Complete',
          description: `${transformedData.length} records ready for import`,
        });
      }
      
    } catch (error) {
      setCurrentJob(prev => prev ? { ...prev, status: 'mapping' } : null);
      toast({
        title: 'Validation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  }, [currentJob, parsedData, toast]);

  // Execute import
  const executeImport = useMutation({
    mutationFn: async () => {
      if (!currentJob || !parsedData.length) throw new Error('No import job or data');
      
      setCurrentJob(prev => prev ? { ...prev, status: 'importing' } : null);
      
      // Transform data based on field mappings
      const transformedData = parsedData.map(row => {
        const transformed: Record<string, unknown> = {};
        
        currentJob.fieldMappings.forEach(mapping => {
          if (mapping.canonicalField && row[mapping.sourceField] !== undefined) {
            transformed[mapping.canonicalField] = row[mapping.sourceField];
          }
        });
        
        return transformed;
      });
      
      let successCount = 0;
      let errorCount = 0;
      
      // Import data in batches
      for (let i = 0; i < transformedData.length; i += 10) {
        const batch = transformedData.slice(i, i + 10);
        
        try {
          const { error } = await supabase.from('subsidies').insert(batch as any);
          if (error) throw error;
          
          successCount += batch.length;
        } catch (error) {
          errorCount += batch.length;
          console.error('Batch import error:', error);
        }
        
        // Update progress
        setCurrentJob(prev => prev ? {
          ...prev,
          processedRows: i + batch.length,
          successRows: successCount,
          errorRows: errorCount,
        } : null);
      }
      
      // Final status update
      setCurrentJob(prev => prev ? {
        ...prev,
        status: 'completed',
        updated_at: new Date().toISOString(),
      } : null);
      
      // Invalidate subsidies query to refresh data
      queryClient.invalidateQueries({ queryKey: ['subsidies'] });
      
      return { successCount, errorCount };
    },
    onSuccess: ({ successCount, errorCount }) => {
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${successCount} records. ${errorCount} failed.`,
      });
    },
    onError: (error) => {
      setCurrentJob(prev => prev ? { ...prev, status: 'failed' } : null);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  // Cancel import
  const cancelImport = useCallback(() => {
    if (currentJob) {
      setCurrentJob({ ...currentJob, status: 'cancelled' });
      setParsedData([]);
      setSourceFields([]);
    }
  }, [currentJob]);

  return {
    currentJob,
    parsedData,
    sourceFields,
    createImportJob,
    updateFieldMappings,
    validateData,
    executeImport,
    cancelImport,
  };
};
