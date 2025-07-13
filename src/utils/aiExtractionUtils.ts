import { supabase } from '@/integrations/supabase/client';

export interface ExtractionResult {
  success: boolean;
  extractedData?: any;
  error?: string;
  confidence?: number;
}

export const triggerDocumentExtraction = async (
  documentId: string,
  fileUrl: string,
  fileName: string,
  documentType: string
): Promise<ExtractionResult> => {
  try {
    console.log(`🤖 Triggering AI extraction for document: ${fileName}`);
    
    const { data, error } = await supabase.functions.invoke('extract-document-data', {
      body: {
        documentId,
        fileUrl,
        fileName,
        documentType
      }
    });

    if (error) {
      console.error('AI extraction failed:', error);
      return {
        success: false,
        error: error.message || 'Extraction failed'
      };
    }

    if (data?.success && data?.extractedData) {
      console.log('✅ AI extraction completed successfully:', data.extractedData);
      return {
        success: true,
        extractedData: data.extractedData,
        confidence: data.extractedData.confidence || 0
      };
    }

    return {
      success: false,
      error: 'No data extracted'
    };
  } catch (error) {
    console.error('Failed to trigger AI extraction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const retryDocumentExtraction = async (
  documentId: string
): Promise<ExtractionResult> => {
  try {
    // Get document details first
    const { data: document, error: docError } = await supabase
      .from('farm_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return {
        success: false,
        error: 'Document not found'
      };
    }

    return await triggerDocumentExtraction(
      documentId,
      document.file_url,
      document.file_name,
      document.category
    );
  } catch (error) {
    console.error('Failed to retry AI extraction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const mapExtractedDataToFormFields = (extractedData: any, formType: 'farm' | 'application' = 'farm') => {
  const mappedData: any = {};

  if (formType === 'farm') {
    // Map extracted fields to farm form fields
    if (extractedData.farmName) mappedData.name = extractedData.farmName;
    if (extractedData.ownerName) mappedData.ownerName = extractedData.ownerName;
    if (extractedData.address) mappedData.address = extractedData.address;
    if (extractedData.totalHectares) mappedData.total_hectares = extractedData.totalHectares;
    if (extractedData.legalStatus) mappedData.legal_status = extractedData.legalStatus;
    if (extractedData.registrationNumber) mappedData.cnp_or_cui = extractedData.registrationNumber;
    if (extractedData.revenue) mappedData.revenue = extractedData.revenue;
    if (extractedData.certifications && Array.isArray(extractedData.certifications)) {
      mappedData.certifications = extractedData.certifications;
    }
    if (extractedData.activities && Array.isArray(extractedData.activities)) {
      mappedData.land_use_types = extractedData.activities;
    }
  }

  return mappedData;
};