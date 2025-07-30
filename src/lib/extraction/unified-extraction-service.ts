/**
 * Unified Extraction Service for Farm Document Processing
 * Provides identical extraction logic for both new and existing farm workflows
 */

import { supabase } from '@/integrations/supabase/client';
import { mapExtractionToForm, validateMappedData } from '@/lib/extraction/centralized-mapper';
import { extractionErrorHandler } from '@/lib/extraction/error-handler';
import { logger } from '@/lib/logger';

export interface ExtractionOptions {
  documentId: string;
  farmId?: string;
  fileName: string;
  fileUrl: string;
  documentType?: string;
  useHybridExtraction?: boolean;
}

export interface ExtractionResult {
  success: boolean;
  extractionId?: string;
  extractedData?: any;
  mappedData?: any;
  confidence?: number;
  category?: string;
  error?: string;
  unmappedFields?: string[];
  validationErrors?: string[];
}

export class UnifiedExtractionService {
  private static instance: UnifiedExtractionService;
  
  static getInstance(): UnifiedExtractionService {
    if (!UnifiedExtractionService.instance) {
      UnifiedExtractionService.instance = new UnifiedExtractionService();
    }
    return UnifiedExtractionService.instance;
  }

  /**
   * Processes document extraction using the hybrid pipeline
   * Works identically for new farms and existing farm updates
   */
  async processDocumentExtraction(options: ExtractionOptions): Promise<ExtractionResult> {
    const { documentId, farmId, fileName, fileUrl, documentType, useHybridExtraction = true } = options;
    
    logger.step('Starting unified document extraction', {
      documentId,
      farmId,
      fileName,
      documentType,
      useHybridExtraction
    });

    try {
      // Step 1: Trigger extraction via edge function
      const extractionResponse = await supabase.functions.invoke('extract-document-data', {
        body: {
          documentId,
          documentUrl: fileUrl,
          documentName: fileName,
          documentType,
          farmId,
          useHybridExtraction
        }
      });

      if (extractionResponse.error) {
        throw new Error(extractionResponse.error.message || 'Extraction service failed');
      }

      const { extractedData, extractionId, confidence, category } = extractionResponse.data;

      logger.success('Extraction completed successfully', {
        extractionId,
        confidence,
        category,
        fieldCount: Object.keys(extractedData || {}).length
      });

      // Step 2: Apply centralized field mapping
      const mappingResult = mapExtractionToForm(extractedData);
      
      // Step 3: Validate mapped data
      const validationErrors = validateMappedData(mappingResult.mappedData);

      // Step 4: Store extraction results for auditing
      if (farmId) {
        await this.storeExtractionAudit({
          farmId,
          documentId,
          extractionId,
          originalData: extractedData,
          mappedData: mappingResult.mappedData,
          confidence,
          category,
          unmappedFields: mappingResult.unmappedFields,
          validationErrors
        });
      }

      return {
        success: true,
        extractionId,
        extractedData,
        mappedData: mappingResult.mappedData,
        confidence,
        category,
        unmappedFields: mappingResult.unmappedFields,
        validationErrors,
      };

    } catch (error) {
      logger.error('Extraction processing failed', error as Error, {
        documentId,
        farmId,
        fileName
      });

      const errorResult = extractionErrorHandler.handleExtractionFailure(error, {
        documentId,
        fileName,
        documentType
      });

      return {
        success: false,
        error: errorResult.error?.message || 'Extraction failed'
      };
    }
  }

  /**
   * Applies extracted data to farm profile
   * Handles both new farm creation and existing farm updates
   */
  async applyExtractionToFarm(
    farmId: string, 
    extractionData: any, 
    options: {
      mergeStrategy?: 'replace' | 'merge' | 'preserve_existing';
      fieldWhitelist?: string[];
      skipValidation?: boolean;
    } = {}
  ): Promise<{ success: boolean; updatedFields: string[]; errors: string[] }> {
    
    const { mergeStrategy = 'merge', fieldWhitelist, skipValidation = false } = options;
    
    logger.step('Applying extraction to farm profile', {
      farmId,
      mergeStrategy,
      fieldWhitelist: fieldWhitelist?.length || 'all',
      extractionFieldCount: Object.keys(extractionData || {}).length
    });

    try {
      // Get current farm data
      const { data: currentFarm, error: fetchError } = await supabase
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch farm data: ${fetchError.message}`);
      }

      // Map extraction data to farm schema
      const mappingResult = mapExtractionToForm(extractionData);
      let fieldsToUpdate = mappingResult.mappedData;

      // Apply field whitelist if specified
      if (fieldWhitelist) {
        fieldsToUpdate = Object.fromEntries(
          Object.entries(fieldsToUpdate).filter(([key]) => fieldWhitelist.includes(key))
        );
      }

      // Apply merge strategy
      let finalData: any = {};
      const updatedFields: string[] = [];

      for (const [key, value] of Object.entries(fieldsToUpdate)) {
        const currentValue = currentFarm[key];
        
        switch (mergeStrategy) {
          case 'replace':
            finalData[key] = value;
            updatedFields.push(key);
            break;
            
          case 'merge':
            if (currentValue === null || currentValue === undefined || currentValue === '') {
              finalData[key] = value;
              updatedFields.push(key);
            }
            break;
            
          case 'preserve_existing':
            if (currentValue === null || currentValue === undefined) {
              finalData[key] = value;
              updatedFields.push(key);
            }
            break;
        }
      }

      // Validate before updating
      const validationErrors = skipValidation ? [] : validateMappedData(finalData);
      
      if (validationErrors.length > 0 && !skipValidation) {
        logger.warn('Validation errors detected', { validationErrors });
        return {
          success: false,
          updatedFields: [],
          errors: validationErrors
        };
      }

      // Update farm profile
      const { error: updateError } = await supabase
        .from('farms')
        .update({
          ...finalData,
          updated_at: new Date().toISOString()
        })
        .eq('id', farmId);

      if (updateError) {
        throw new Error(`Failed to update farm: ${updateError.message}`);
      }

      logger.success('Farm profile updated successfully', {
        farmId,
        updatedFields,
        updateCount: updatedFields.length
      });

      return {
        success: true,
        updatedFields,
        errors: validationErrors
      };

    } catch (error) {
      logger.error('Failed to apply extraction to farm', error as Error, { farmId });
      return {
        success: false,
        updatedFields: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Stores extraction audit trail for compliance and debugging
   */
  private async storeExtractionAudit(auditData: {
    farmId: string;
    documentId: string;
    extractionId: string;
    originalData: any;
    mappedData: any;
    confidence: number;
    category: string;
    unmappedFields: string[];
    validationErrors: string[];
  }) {
    try {
      await supabase.from('document_extraction_reviews').insert({
        extraction_id: auditData.extractionId,
        reviewer_id: null, // System-generated
        original_data: auditData.originalData,
        corrected_data: auditData.mappedData,
        reviewer_notes: `Automated mapping: ${auditData.unmappedFields.length} unmapped fields, ${auditData.validationErrors.length} validation warnings`,
        review_status: auditData.validationErrors.length > 0 ? 'needs_review' : 'approved'
      });

      logger.debug('Extraction audit stored successfully', {
        extractionId: auditData.extractionId,
        farmId: auditData.farmId
      });
    } catch (error) {
      logger.warn('Failed to store extraction audit', { error, extractionId: auditData.extractionId });
    }
  }

  /**
   * Retrieves extraction history for a farm
   */
  async getExtractionHistory(farmId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('document_extractions')
        .select(`
          *,
          farm_documents!inner(farm_id, file_name),
          document_extraction_reviews(*)
        `)
        .eq('farm_documents.farm_id', farmId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to fetch extraction history', error as Error, { farmId });
      return [];
    }
  }

  /**
   * Bulk re-extraction for existing farms (admin feature)
   */
  async reprocessFarmDocuments(farmId: string): Promise<{
    processed: number;
    successful: number;
    failed: string[];
  }> {
    logger.step('Starting bulk re-extraction for farm', { farmId });

    try {
      // Get all documents for the farm
      const { data: documents, error } = await supabase
        .from('farm_documents')
        .select('*')
        .eq('farm_id', farmId);

      if (error) throw error;

      const results = {
        processed: 0,
        successful: 0,
        failed: [] as string[]
      };

      for (const doc of documents || []) {
        results.processed++;
        
        try {
          const extractionResult = await this.processDocumentExtraction({
            documentId: doc.id,
            farmId,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            documentType: doc.category
          });

          if (extractionResult.success) {
            results.successful++;
            
            // Apply to farm profile
            if (extractionResult.mappedData) {
              await this.applyExtractionToFarm(farmId, extractionResult.mappedData, {
                mergeStrategy: 'preserve_existing'
              });
            }
          } else {
            results.failed.push(`${doc.file_name}: ${extractionResult.error}`);
          }
        } catch (docError) {
          results.failed.push(`${doc.file_name}: ${docError}`);
        }
      }

      logger.success('Bulk re-extraction completed', results);
      return results;

    } catch (error) {
      logger.error('Bulk re-extraction failed', error as Error, { farmId });
      throw error;
    }
  }
}

export const unifiedExtractionService = UnifiedExtractionService.getInstance();