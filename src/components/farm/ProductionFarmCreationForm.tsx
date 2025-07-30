/**
 * Production-ready Farm Creation Form
 * Integrates centralized mapping, proper error handling, and bidirectional sync
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { farmValidationSchema, type FarmFormData } from '@/schemas/farmValidation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTempDocumentUpload } from '@/hooks/useTempDocumentUpload';
import { mapExtractionToForm, validateMappedData } from '@/lib/extraction/centralized-mapper';
import { extractionErrorHandler } from '@/lib/extraction/error-handler';
import { logger } from '@/lib/logger';
import DocumentUploadArea from '@/components/farm/DocumentUploadArea';
import FarmCreationFormSections from '@/components/farm/FarmCreationFormSections';
import FullExtractionReview from '@/components/review/FullExtractionReview';

interface ProductionFarmCreationFormProps {
  onSubmit: (data: FarmFormData) => void;
  isLoading?: boolean;
}

const ProductionFarmCreationForm: React.FC<ProductionFarmCreationFormProps> = ({
  onSubmit,
  isLoading = false
}) => {
  const [showReview, setShowReview] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [lastExtractionData, setLastExtractionData] = useState<any>(null);

  const form = useForm<FarmFormData>({
    resolver: zodResolver(farmValidationSchema),
    defaultValues: {
      name: '',
      address: '',
      legal_status: '',
      cnp_or_cui: '',
      country: '',
      department: '',
      locality: '',
      own_or_lease: false,
      total_hectares: 0,
      land_use_types: [],
      livestock_present: false,
      livestock: {},
      environmental_permit: false,
      tech_docs: false,
      subsidy_interest: [],
      phone: '',
      preferred_language: '',
      gdpr_consent: false,
      notify_consent: false,
      matching_tags: [],
      staff_count: 0,
      certifications: [],
      irrigation_method: '',
      revenue: '',
      software_used: []
    }
  });

  const { documents, getExtractionData } = useTempDocumentUpload();

  // Watch form changes for bidirectional sync
  const formValues = form.watch();

  /**
   * Handles applying extraction data to form with comprehensive mapping and validation
   */
  const handleApplyExtraction = useCallback(async (documentId: string) => {
    try {
      logger.step('Applying extraction data to form', { documentId });

      const extractionResult = await getExtractionData(documentId);
      if (!extractionResult?.extraction_data) {
        toast.error('No extraction data available');
        return;
      }

      // Use centralized mapper for consistent field mapping
      const mappingResult = mapExtractionToForm(extractionResult.extraction_data);
      
      // Validate mapped data
      const validationErrors = validateMappedData(mappingResult.mappedData);
      
      if (validationErrors.length > 0) {
        logger.warn('Validation warnings in mapped data', { errors: validationErrors });
        toast.warning(`Data applied with warnings: ${validationErrors.join(', ')}`);
      }

      // Apply mapped data to form
      Object.entries(mappingResult.mappedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          form.setValue(key as keyof FarmFormData, value, { shouldValidate: true });
        }
      });

      // Store extraction data for bidirectional sync
      setLastExtractionData(extractionResult.extraction_data);

      // Success feedback
      const successMessage = `Applied ${mappingResult.mappingStats.mappedFields} fields (${mappingResult.mappingStats.successRate.toFixed(0)}% success rate)`;
      
      if (mappingResult.unmappedFields.length > 0) {
        logger.info('Some fields could not be mapped', { 
          unmappedFields: mappingResult.unmappedFields 
        });
      }

      toast.success(successMessage);
      
      // Close review modal
      setShowReview(false);
      
      logger.success('Extraction data applied successfully', {
        mappedFields: mappingResult.mappingStats.mappedFields,
        successRate: mappingResult.mappingStats.successRate,
        unmappedFields: mappingResult.unmappedFields.length
      });

    } catch (error) {
      logger.error('Failed to apply extraction data', error as Error, { documentId });
      
      const errorInfo = extractionErrorHandler.getErrorDisplayInfo({
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        recoverable: true
      });
      
      toast.error(errorInfo.message);
    }
  }, [getExtractionData, form]);

  /**
   * Handles applying all extracted data from all documents
   */
  const handleApplyAllExtractedData = useCallback(async () => {
    const extractedDocuments = documents.filter(doc => doc.extraction_status === 'completed');
    
    if (extractedDocuments.length === 0) {
      toast.warning('No extracted data available to apply');
      return;
    }

    logger.step('Applying all extracted data', { 
      documentCount: extractedDocuments.length 
    });

    let totalApplied = 0;
    let errors = 0;

    for (const doc of extractedDocuments) {
      try {
        await handleApplyExtraction(doc.id);
        totalApplied++;
      } catch (error) {
        errors++;
        logger.error('Failed to apply data from document', error as Error, { 
          documentId: doc.id, 
          fileName: doc.fileName 
        });
      }
    }

    if (totalApplied > 0) {
      toast.success(`Applied data from ${totalApplied} document(s)`);
    }
    
    if (errors > 0) {
      toast.error(`Failed to apply data from ${errors} document(s)`);
    }
  }, [documents, handleApplyExtraction]);

  /**
   * Handles form submission with comprehensive validation
   */
  const handleFormSubmit = async (data: FarmFormData) => {
    try {
      logger.step('Submitting farm form', { 
        formData: Object.keys(data).length 
      });

      // Additional validation
      const validationErrors = validateMappedData(data);
      if (validationErrors.length > 0) {
        toast.error(`Please fix the following issues: ${validationErrors.join(', ')}`);
        return;
      }

      await onSubmit(data);
      
      logger.success('Farm form submitted successfully');
      
    } catch (error) {
      logger.error('Form submission failed', error as Error, { formData: data });
      toast.error('Failed to create farm profile. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Document Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Farm Documents (Recommended)</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUploadArea />
          
          {/* Uploaded Documents */}
          {documents.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Uploaded Documents ({documents.length})</h3>
                <Button 
                  onClick={handleApplyAllExtractedData}
                  variant="outline"
                  disabled={!documents.some(doc => doc.extraction_status === 'completed')}
                >
                  Apply All Extracted Data
                </Button>
              </div>
              
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {doc.extraction_status}
                        {doc.extraction_status === 'completed' && doc.category && (
                          <span className="ml-2">
                            Category: {doc.category} ({doc.confidence}% confidence)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {doc.extraction_status === 'completed' && (
                        <Button
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedDocument(doc.id);
                            setShowReview(true);
                          }}
                        >
                          Review Data
                        </Button>
                      )}
                      {doc.extraction_status === 'failed' && (
                        <span className="text-destructive text-sm">
                          {doc.error_message || 'Extraction failed'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Form Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Farm Information Entry</CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete or adjust any information below. Fields may already be filled from uploaded documents.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <FarmCreationFormSections form={form} />
            
            <div className="flex gap-4 pt-6">
              <Button type="button" variant="outline" disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Farm Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Extraction Review Modal */}
      {showReview && selectedDocument && (
        <FullExtractionReview
          open={showReview}
          onOpenChange={setShowReview}
          documentId={selectedDocument}
          onApplyExtraction={handleApplyExtraction}
        />
      )}
    </div>
  );
};

export default ProductionFarmCreationForm;