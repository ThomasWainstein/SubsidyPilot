import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { mapExtractedFields, validateMappedData, calculateExtractionConfidence, mergeExtractionResults } from '@/utils/extractionMapping';
import { validateExtractionDataIntegrity, safeProductionError } from '@/utils/productionGuards';

/**
 * Central orchestrator for upload → extraction → review → form sync workflow
 * Provides bi-directional synchronization between review edits and form data
 * Replaces scattered state management with unified coordination
 */

interface ExtractionState {
  status: 'idle' | 'uploading' | 'extracting' | 'reviewing' | 'completed' | 'error';
  progress: number;
  currentFile?: string;
  error?: string;
}

interface ExtractionResult {
  documentId: string;
  fileName: string;
  extractedData: Record<string, any>;
  confidence: number;
  source: string;
  validationResults: {
    isValid: boolean;
    missingFields: string[];
    score: number;
  };
}

interface UseExtractionOrchestratorOptions {
  farmId: string;
  onExtractionComplete?: (results: ExtractionResult[]) => void;
  onStateChange?: (state: ExtractionState) => void;
  autoSync?: boolean; // Auto-sync extracted data to form
}

export const useExtractionOrchestrator = (options: UseExtractionOrchestratorOptions) => {
  const { farmId, onExtractionComplete, onStateChange, autoSync = true } = options;
  
  const [state, setState] = useState<ExtractionState>({
    status: 'idle',
    progress: 0
  });
  
  const [extractionResults, setExtractionResults] = useState<ExtractionResult[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [reviewEdits, setReviewEdits] = useState<Record<string, Record<string, any>>>({});
  
  // Bi-directional sync state management
  const syncInProgress = useRef(false);
  const lastSyncTimestamp = useRef<number>(0);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Bi-directional sync effect - sync review edits to form data
  useEffect(() => {
    if (autoSync && !syncInProgress.current) {
      const hasNewEdits = Object.keys(reviewEdits).length > 0;
      const hasNewExtractions = extractionResults.length > 0;
      
      if (hasNewEdits || hasNewExtractions) {
        const now = Date.now();
        // Debounce sync operations to prevent conflicts
        if (now - lastSyncTimestamp.current > 500) {
          performBidirectionalSync();
          lastSyncTimestamp.current = now;
        }
      }
    }
  }, [reviewEdits, extractionResults, autoSync]);

  const updateState = useCallback((updates: Partial<ExtractionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Bi-directional synchronization between review edits and form data
   */
  const performBidirectionalSync = useCallback(() => {
    if (syncInProgress.current) return;
    
    syncInProgress.current = true;
    logger.debug('Starting bi-directional sync', {
      editCount: Object.keys(reviewEdits).length,
      extractionCount: extractionResults.length
    });

    try {
      // Step 1: Merge all extraction results
      const allExtractions = extractionResults.map(result => ({
        source: `extraction_${result.source}`,
        data: result.extractedData,
        confidence: result.confidence
      }));

      // Step 2: Add review edits as highest priority source
      Object.entries(reviewEdits).forEach(([documentId, edits]) => {
        if (Object.keys(edits).length > 0) {
          allExtractions.push({
            source: `manual_edit_${documentId}`,
            data: edits,
            confidence: 1.0 // Manual edits have highest confidence
          });
        }
      });

      // Step 3: Merge all sources with conflict resolution
      if (allExtractions.length > 0) {
        const { mergedData, fieldSources } = mergeExtractionResults(allExtractions);
        
        // Step 4: Update form data with merged results
        setFormData(prev => {
          const updated = { ...prev };
          
          // Apply merged data
          Object.entries(mergedData).forEach(([field, value]) => {
            updated[field] = value;
            updated[`${field}_source`] = fieldSources[field];
            updated[`${field}_sync_timestamp`] = Date.now();
          });
          
          return updated;
        });

        logger.debug('Bi-directional sync completed', {
          fieldsUpdated: Object.keys(mergedData).length,
          sources: Object.values(fieldSources)
        });
      }
    } catch (error) {
      logger.error('Bi-directional sync failed', error instanceof Error ? error : new Error(String(error)));
    } finally {
      syncInProgress.current = false;
    }
  }, [reviewEdits, extractionResults]);

  const processDocumentUpload = useCallback(async (
    files: File[],
    category: string
  ): Promise<void> => {
    updateState({ status: 'uploading', progress: 0, error: undefined });
    
    try {
      const totalFiles = files.length;
      const uploadResults: any[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        updateState({ 
          currentFile: file.name, 
          progress: (i / totalFiles) * 50 // First 50% for upload
        });
        
        logger.debug('Uploading file', { fileName: file.name, index: i + 1, total: totalFiles });
        
        // Upload file to Supabase
        const fileName = `${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('farm-documents')
          .upload(`${farmId}/${fileName}`, file);
        
        if (uploadError) {
          throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
        }
        
        // Create document record
        const { data: documentData, error: documentError } = await supabase
          .from('farm_documents')
          .insert({
            farm_id: farmId,
            file_name: file.name,
            file_url: `${supabase.storage.from('farm-documents').getPublicUrl(uploadData.path).data.publicUrl}`,
            category: category as any, // Cast to match the enum type
            file_size: file.size
          })
          .select()
          .single();
        
        if (documentError) {
          throw new Error(`Document record creation failed: ${documentError.message}`);
        }
        
        uploadResults.push({
          file,
          documentId: documentData.id,
          fileUrl: documentData.file_url
        });
      }
      
      // Start extraction phase
      updateState({ status: 'extracting', progress: 50 });
      await processExtractions(uploadResults);
      
    } catch (error) {
      const safeError = safeProductionError(error, 'document upload');
      logger.error('Upload processing failed', safeError);
      updateState({ 
        status: 'error', 
        error: safeError.message
      });
      toast({
        title: 'Upload Failed',
        description: safeError.message,
        variant: 'destructive'
      });
    }
  }, [farmId]);

  const processExtractions = useCallback(async (
    uploadResults: Array<{ file: File; documentId: string; fileUrl: string }>
  ): Promise<void> => {
    const totalExtractions = uploadResults.length;
    const newResults: ExtractionResult[] = [];
    
    for (let i = 0; i < uploadResults.length; i++) {
      const { file, documentId, fileUrl } = uploadResults[i];
      
      updateState({ 
        currentFile: file.name, 
        progress: 50 + ((i / totalExtractions) * 40) // 50-90% for extraction
      });
      
      try {
        logger.debug('Starting extraction', { fileName: file.name, documentId });
        
        // Call hybrid extraction function
        const { data: extractionData, error: extractionError } = await supabase.functions
          .invoke('hybrid-extraction', {
            body: {
              documentUrl: fileUrl,
              documentId: documentId
            }
          });
        
        if (extractionError) {
          logger.error('Extraction failed', extractionError, { fileName: file.name });
          continue; // Skip failed extractions
        }
        
        // Validate extraction data integrity
        try {
          validateExtractionDataIntegrity(extractionData, 'hybrid-extraction');
        } catch (error) {
          logger.error('Extraction data validation failed', error instanceof Error ? error : new Error(String(error)));
          continue; // Skip suspicious data
        }
        
        // Map and validate extracted data
        const mappedData = mapExtractedFields(extractionData.extractedFields || {});
        const validationResults = validateMappedData(mappedData);
        const confidence = calculateExtractionConfidence(mappedData);
        
        const result: ExtractionResult = {
          documentId,
          fileName: file.name,
          extractedData: mappedData,
          confidence,
          source: extractionData.source || 'unknown',
          validationResults
        };
        
        newResults.push(result);
        logger.success('Extraction completed', { 
          fileName: file.name, 
          fieldsCount: Object.keys(mappedData).length,
          confidence 
        });
        
      } catch (error) {
        logger.error('Extraction processing failed', error, { fileName: file.name });
      }
    }
    
    setExtractionResults(prev => [...prev, ...newResults]);
    
    // Auto-sync to form if enabled
    if (autoSync && newResults.length > 0) {
      // Trigger sync after state update
      setTimeout(() => performBidirectionalSync(), 100);
    }
    
    updateState({ status: 'reviewing', progress: 90 });
    onExtractionComplete?.(newResults);
    
  }, [autoSync, onExtractionComplete, performBidirectionalSync]);

  const applyReviewEdit = useCallback((
    documentId: string, 
    field: string, 
    value: any
  ) => {
    logger.debug('Applying review edit', { documentId, field, value: typeof value === 'object' ? '[object]' : value });
    
    setReviewEdits(prev => {
      const updated = {
        ...prev,
        [documentId]: {
          ...prev[documentId],
          [field]: value,
          [`${field}_edited_at`]: Date.now(),
          [`${field}_edit_source`]: 'manual_review'
        }
      };
      
      logger.debug('Review edits updated', { 
        documentId, 
        totalEdits: Object.keys(updated[documentId]).length 
      });
      
      return updated;
    });
    
    // Trigger immediate sync if auto-sync is enabled
    if (autoSync) {
      setTimeout(() => performBidirectionalSync(), 100); // Slight delay to batch edits
    }
  }, [autoSync, performBidirectionalSync]);

  const acceptExtraction = useCallback((documentId: string) => {
    const result = extractionResults.find(r => r.documentId === documentId);
    if (!result) return;
    
    // Apply all fields from this extraction as manual edits (highest priority)
    setReviewEdits(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        ...result.extractedData,
        _accepted_at: Date.now(),
        _acceptance_source: result.source
      }
    }));
    
    logger.debug('Extraction accepted and applied as review edits', { documentId });
    
    toast({
      title: 'Extraction Accepted',
      description: `Data from ${result.fileName} will be applied to the form`
    });
  }, [extractionResults]);

  const rejectExtraction = useCallback((documentId: string) => {
    setExtractionResults(prev => prev.filter(r => r.documentId !== documentId));
    
    // Remove any edits for this document
    setReviewEdits(prev => {
      const { [documentId]: removed, ...rest } = prev;
      return rest;
    });
    
    logger.debug('Extraction rejected and removed', { documentId });
    
    toast({
      title: 'Extraction Rejected',
      description: 'Extraction data has been removed'
    });
  }, []);

  const retryExtraction = useCallback(async (documentId: string, forceAI = false) => {
    const result = extractionResults.find(r => r.documentId === documentId);
    if (!result) return;
    
    updateState({ status: 'extracting', currentFile: result.fileName });
    
    try {
      // Get document details for retry
      const { data: document } = await supabase
        .from('farm_documents')
        .select('file_url')
        .eq('id', documentId)
        .maybeSingle();
      
      if (!document) {
        throw new Error('Document not found for retry');
      }
      
      // Call extraction with force AI if requested
      const { data: extractionData, error } = await supabase.functions
        .invoke('hybrid-extraction', {
          body: {
            documentUrl: document.file_url,
            documentId: documentId,
            forceAI
          }
        });
      
      if (error) throw error;
      
      // Update the result
      const mappedData = mapExtractedFields(extractionData.extractedFields || {});
      const validationResults = validateMappedData(mappedData);
      const confidence = calculateExtractionConfidence(mappedData);
      
      const updatedResult: ExtractionResult = {
        ...result,
        extractedData: mappedData,
        confidence,
        source: extractionData.source,
        validationResults
      };
      
      setExtractionResults(prev => 
        prev.map(r => r.documentId === documentId ? updatedResult : r)
      );
      
      updateState({ status: 'reviewing' });
      
      toast({
        title: 'Extraction Retried',
        description: `${result.fileName} has been re-processed with ${forceAI ? 'AI' : 'hybrid'} extraction`
      });
      
    } catch (error) {
      const safeError = safeProductionError(error, 'extraction retry');
      logger.error('Extraction retry failed', safeError, { documentId });
      updateState({ status: 'error', error: safeError.message });
    }
  }, [extractionResults]);

  const completeReview = useCallback(() => {
    updateState({ status: 'completed', progress: 100 });
    
    toast({
      title: 'Review Completed',
      description: 'All extractions have been processed and are ready for use'
    });
  }, []);

  const reset = useCallback(() => {
    logger.debug('Resetting extraction orchestrator');
    
    setState({ status: 'idle', progress: 0 });
    setExtractionResults([]);
    setFormData({});
    setReviewEdits({});
    
    // Reset sync state
    syncInProgress.current = false;
    lastSyncTimestamp.current = 0;
  }, []);

  /**
   * Force a manual sync between review edits and form data
   */
  const forceSyncReviewToForm = useCallback(() => {
    logger.debug('Force sync requested');
    performBidirectionalSync();
  }, [performBidirectionalSync]);

  /**
   * Update form field manually (with conflict detection)
   */
  const updateFormField = useCallback((field: string, value: any, source = 'manual_form_edit') => {
    setFormData(prev => {
      const updated = { ...prev };
      const existingSource = prev[`${field}_source`];
      
      // Check for potential conflicts
      if (existingSource && existingSource !== source && existingSource !== 'manual_form_edit') {
        logger.warn('Form field conflict detected', { 
          field, 
          existingSource, 
          newSource: source 
        });
      }
      
      updated[field] = value;
      updated[`${field}_source`] = source;
      updated[`${field}_updated_at`] = Date.now();
      
      return updated;
    });
    
    logger.debug('Form field updated manually', { field, source });
  }, []);

  return {
    // State
    state,
    extractionResults,
    formData,
    reviewEdits,
    
    // Actions
    processDocumentUpload,
    applyReviewEdit,
    acceptExtraction,
    rejectExtraction,
    retryExtraction,
    completeReview,
    reset,
    
    // Manual sync methods
    forceSyncReviewToForm,
    updateFormField,
    
    // Sync utilities
    performBidirectionalSync,
    getSyncStatus: () => ({
      inProgress: syncInProgress.current,
      lastSync: lastSyncTimestamp.current,
      hasConflicts: Object.values(formData).some(key => 
        typeof key === 'string' && key.includes('conflict')
      )
    }),
    
    // Computed properties
    isProcessing: ['uploading', 'extracting'].includes(state.status),
    hasResults: extractionResults.length > 0,
    hasErrors: state.status === 'error',
    canComplete: state.status === 'reviewing' && extractionResults.length > 0,
    hasPendingEdits: Object.keys(reviewEdits).length > 0,
    fieldCount: Object.keys(formData).filter(key => !key.includes('_')).length,
  };
};

export default useExtractionOrchestrator;