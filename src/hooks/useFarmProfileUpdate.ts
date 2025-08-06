/**
 * Enhanced Farm Profile Update Hook
 * Provides unified extraction and form update capabilities for existing farms
 */

import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { farmEditSchema, type FarmEditData } from '@/schemas/farmValidation';
import { unifiedExtractionService } from '@/lib/extraction/unified-extraction-service';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useFarm, useUpdateFarm } from '@/hooks/useFarms';
import { supabase } from '@/integrations/supabase/client';

export interface FarmProfileUpdateOptions {
  farmId: string;
  enableAutoExtraction?: boolean;
  mergeStrategy?: 'replace' | 'merge' | 'preserve_existing';
}

export const useFarmProfileUpdate = ({ farmId, enableAutoExtraction = true, mergeStrategy = 'merge' }: FarmProfileUpdateOptions) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionHistory, setExtractionHistory] = useState<any[]>([]);
  const [pendingExtractions, setPendingExtractions] = useState<Map<string, any>>(new Map());
  
  const queryClient = useQueryClient();
  const { data: farm, isLoading: farmLoading } = useFarm(farmId);
  const updateFarmMutation = useUpdateFarm();

  // Initialize form with current farm data
  const form = useForm<FarmEditData>({
    resolver: zodResolver(farmEditSchema),
    defaultValues: farm ? {
      name: farm.name || '',
      address: farm.address || '',
      legal_status: farm.legal_status || '',
      cnp_or_cui: farm.cnp_or_cui || '',
      country: farm.country || '',
      department: farm.department || '',
      locality: farm.locality || '',
      own_or_lease: farm.own_or_lease || false,
      total_hectares: farm.total_hectares || 0,
      land_use_types: farm.land_use_types || [],
      livestock_present: farm.livestock_present || false,
      livestock: (farm.livestock && typeof farm.livestock === 'object') ? farm.livestock as { [x: string]: any } : {},
      environmental_permit: farm.environmental_permit || false,
      tech_docs: farm.tech_docs || false,
      subsidy_interest: farm.subsidy_interest || [],
      phone: farm.phone || '',
      preferred_language: farm.preferred_language || 'en',
      revenue: farm.revenue || '',
      software_used: farm.software_used || [],
      staff_count: farm.staff_count || 0,
      certifications: farm.certifications || [],
      irrigation_method: farm.irrigation_method || ''
    } : {}
  });

  // Update form when farm data loads
  React.useEffect(() => {
    if (farm && !farmLoading) {
      form.reset({
        name: farm.name || '',
        address: farm.address || '',
        legal_status: farm.legal_status || '',
        cnp_or_cui: farm.cnp_or_cui || '',
        country: farm.country || '',
        department: farm.department || '',
        locality: farm.locality || '',
        own_or_lease: farm.own_or_lease || false,
        total_hectares: farm.total_hectares || 0,
        land_use_types: farm.land_use_types || [],
        livestock_present: farm.livestock_present || false,
        livestock: (farm.livestock && typeof farm.livestock === 'object') ? farm.livestock as { [x: string]: any } : {},
        environmental_permit: farm.environmental_permit || false,
        tech_docs: farm.tech_docs || false,
        subsidy_interest: farm.subsidy_interest || [],
        phone: farm.phone || '',
        preferred_language: farm.preferred_language || 'en',
        revenue: farm.revenue || '',
        software_used: farm.software_used || [],
        staff_count: farm.staff_count || 0,
        certifications: farm.certifications || [],
        irrigation_method: farm.irrigation_method || ''
      });
    }
  }, [farm, farmLoading, form]);

  /**
   * Processes new document extraction for existing farm
   */
  const processDocumentExtraction = useCallback(async (
    documentId: string,
    fileName: string,
    fileUrl: string,
    documentType?: string
  ) => {
    if (!farmId) {
      throw new Error('Farm ID is required for document extraction');
    }

    setIsExtracting(true);
    logger.step('Processing document extraction for existing farm', {
      farmId,
      documentId,
      fileName,
      documentType
    });

    try {
      const extractionResult = await unifiedExtractionService.processDocumentExtraction({
        documentId,
        farmId,
        fileName,
        fileUrl,
        documentType,
        useHybridExtraction: true
      });

      if (!extractionResult.success) {
        throw new Error(extractionResult.error || 'Extraction failed');
      }

      // Store in pending extractions for review
      setPendingExtractions(prev => new Map(prev.set(documentId, {
        documentId,
        fileName,
        extractionId: extractionResult.extractionId,
        extractedData: extractionResult.extractedData,
        mappedData: extractionResult.mappedData,
        confidence: extractionResult.confidence,
        category: extractionResult.category,
        unmappedFields: extractionResult.unmappedFields || [],
        validationErrors: extractionResult.validationErrors || [],
        timestamp: new Date()
      })));

      // Auto-apply if enabled and high confidence
      if (enableAutoExtraction && extractionResult.confidence && extractionResult.confidence > 85) {
        await applyExtractionToForm(documentId, extractionResult.mappedData);
        toast.success(`High-confidence data from ${fileName} applied automatically`);
      } else {
        toast.success(`Extraction completed for ${fileName}. Review and apply changes manually.`);
      }

      return extractionResult;

    } catch (error) {
      logger.error('Document extraction failed', error as Error, {
        farmId,
        documentId,
        fileName
      });
      
      setPendingExtractions(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentId);
        return newMap;
      });

      toast.error(`Extraction failed for ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      setIsExtracting(false);
    }
  }, [farmId, enableAutoExtraction]);

  /**
   * Applies extracted data to form
   */
  const applyExtractionToForm = useCallback(async (
    documentId: string,
    extractedData?: any,
    options: {
      fieldWhitelist?: string[];
      skipConfirmation?: boolean;
    } = {}
  ) => {
    const { fieldWhitelist, skipConfirmation = false } = options;

    try {
      // Get extraction data - if not provided, fetch the best extraction from database
      let extraction = extractedData;
      
      if (!extraction) {
        const { data: bestExtraction, error } = await supabase
          .from('document_extractions')
          .select('*')
          .eq('document_id', documentId)
          .eq('status', 'completed')
          .gte('confidence_score', 0.5)  // Only get decent confidence extractions
          .order('confidence_score', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) throw error;
        
        if (!bestExtraction) {
          throw new Error('No suitable extraction found with sufficient confidence');
        }
        
        // Map the extracted data using the centralized mapper
        const { mapExtractionToForm } = await import('@/lib/extraction/centralized-mapper');
        const mappingResult = mapExtractionToForm(bestExtraction.extracted_data as any);
        extraction = mappingResult.mappedData;
        
        console.log('📋 Applied best extraction:', {
          documentId,
          confidence: bestExtraction.confidence_score,
          mappedFields: Object.keys(extraction).length,
          extractionData: bestExtraction.extracted_data
        });
      }
      
      if (!extraction || Object.keys(extraction).length === 0) {
        throw new Error('No valid extraction data found');
      }

      logger.step('Applying extraction to form', {
        farmId,
        documentId,
        fieldCount: Object.keys(extraction).length,
        fieldWhitelist: fieldWhitelist?.length || 'all'
      });

      // Filter fields if whitelist provided
      const fieldsToApply = fieldWhitelist 
        ? Object.fromEntries(Object.entries(extraction).filter(([key]) => fieldWhitelist.includes(key)))
        : extraction;

      // Apply to form
      let appliedCount = 0;
      for (const [key, value] of Object.entries(fieldsToApply)) {
        if (value !== undefined && value !== null && value !== '') {
          const currentValue = form.getValues(key as keyof FarmEditData);
          
          // Apply merge strategy
          let shouldApply = false;
          switch (mergeStrategy) {
            case 'replace':
              shouldApply = true;
              break;
            case 'merge':
              shouldApply = !currentValue || currentValue === '' || currentValue === 0;
              break;
            case 'preserve_existing':
              shouldApply = !currentValue;
              break;
          }

          if (shouldApply) {
            form.setValue(key as keyof FarmEditData, value, { shouldValidate: true });
            appliedCount++;
          }
        }
      }

      // Form data will be saved when user clicks Save Changes

      // Remove from pending extractions
      setPendingExtractions(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentId);
        return newMap;
      });

      // Invalidate farm data to refresh UI
      queryClient.invalidateQueries({ queryKey: ['farm', farmId] });

      toast.success(`Applied ${appliedCount} fields to farm profile`);
      
      logger.success('Extraction applied successfully', {
        farmId,
        documentId,
        appliedCount
      });

    } catch (error) {
      logger.error('Failed to apply extraction to form', error as Error, {
        farmId,
        documentId
      });
      toast.error(`Failed to apply extraction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [farmId, form, mergeStrategy, pendingExtractions, queryClient]);

  /**
   * Saves form changes to database
   */
  const saveFarmProfile = useCallback(async (data: FarmEditData) => {
    try {
      logger.step('Saving farm profile changes', {
        farmId,
        changeCount: Object.keys(data).length
      });

      await updateFarmMutation.mutateAsync({
        id: farmId,
        ...data
      });

      toast.success('Farm profile updated successfully');
      
      logger.success('Farm profile saved', { farmId });

    } catch (error) {
      logger.error('Failed to save farm profile', error as Error, { farmId });
      toast.error(`Failed to save farm profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [farmId, updateFarmMutation]);

  /**
   * Gets extraction history for the farm
   */
  const loadExtractionHistory = useCallback(async () => {
    try {
      const history = await unifiedExtractionService.getExtractionHistory(farmId);
      setExtractionHistory(history);
      return history;
    } catch (error) {
      logger.error('Failed to load extraction history', error as Error, { farmId });
      return [];
    }
  }, [farmId]);

  /**
   * Bulk re-processes all farm documents
   */
  const reprocessAllDocuments = useCallback(async () => {
    try {
      setIsExtracting(true);
      const results = await unifiedExtractionService.reprocessFarmDocuments(farmId);
      
      toast.success(`Reprocessed ${results.successful}/${results.processed} documents`);
      
      if (results.failed.length > 0) {
        logger.warn('Some documents failed reprocessing', { failed: results.failed });
      }

      // Refresh farm data
      queryClient.invalidateQueries({ queryKey: ['farm', farmId] });
      
      return results;
    } catch (error) {
      logger.error('Bulk reprocessing failed', error as Error, { farmId });
      toast.error('Failed to reprocess documents');
      throw error;
    } finally {
      setIsExtracting(false);
    }
  }, [farmId, queryClient]);

  return {
    // Form management
    form,
    farm,
    farmLoading,
    
    // Extraction state
    isExtracting,
    pendingExtractions: Array.from(pendingExtractions.values()),
    extractionHistory,
    
    // Actions
    processDocumentExtraction,
    applyExtractionToForm,
    saveFarmProfile,
    loadExtractionHistory,
    reprocessAllDocuments,
    
    // Utilities
    isPending: (documentId: string) => pendingExtractions.has(documentId),
    getExtractionData: (documentId: string) => pendingExtractions.get(documentId),
    clearPendingExtraction: (documentId: string) => {
      setPendingExtractions(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentId);
        return newMap;
      });
    }
  };
};