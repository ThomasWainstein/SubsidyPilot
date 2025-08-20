import { supabase } from '@/integrations/supabase/client';

export interface ExtractionResult {
  success: boolean;
  extractedData?: any;
  error?: string;
  confidence?: number;
  costBreakdown?: {
    googleVisionCost?: number;
    openaiCost?: number;
    totalCost?: number;
  };
  tokensUsed?: number;
  qualityScore?: number;
  extractionMethod?: string;
  ocrMetadata?: {
    detectionType: string;
    pageCount: number;
    languagesDetected: string[];
    processingTime: number;
    textQuality: 'high' | 'medium' | 'low';
    confidence: number;
  };
  processingLog?: string[];
}

export type ClientType = 'individual' | 'business' | 'municipality' | 'ngo' | 'farm';

/**
 * Triggers document extraction using either hybrid OCR (Google Vision + OpenAI) 
 * or pure OpenAI approach
 */
export const triggerExtraction = async (
  documentId: string,
  fileUrl: string,
  fileName: string,
  documentType: string,
  clientType: ClientType = 'farm',
  useHybridOCR: boolean = true
): Promise<ExtractionResult> => {
  try {
    console.log(`🚀 Triggering ${useHybridOCR ? 'hybrid OCR' : 'pure OpenAI'} extraction for ${clientType}: ${fileName}`);
    
    const functionName = useHybridOCR ? 'hybrid-ocr-extraction' : 'extract-document-data';
    const body = useHybridOCR ? {
      documentId,
      fileUrl,
      fileName,
      clientType,
      documentType
    } : {
      documentId,
      fileUrl,
      fileName,
      documentType
    };

    const { data, error } = await supabase.functions.invoke(functionName, { body });

    if (error) {
      console.error('Extraction failed:', error);
      return {
        success: false,
        error: error.message || 'Extraction failed'
      };
    }

    if (data?.success && data?.extractedData) {
      console.log(`✅ ${useHybridOCR ? 'Hybrid' : 'OpenAI'} extraction completed successfully`);
      return {
        success: true,
        extractedData: data.extractedData,
        confidence: data.confidence || 0,
        costBreakdown: data.costBreakdown,
        tokensUsed: data.tokensUsed,
        qualityScore: data.qualityScore,
        extractionMethod: data.extractionMethod,
        ocrMetadata: data.ocrMetadata,
        processingLog: data.processingLog
      };
    }

    return {
      success: false,
      error: 'No data extracted'
    };
  } catch (error) {
    console.error('Failed to trigger extraction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Retry extraction for a specific document
 */
export const retryExtraction = async (
  documentId: string,
  useHybridOCR: boolean = true
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

    return await triggerExtraction(
      documentId,
      document.file_url,
      document.file_name,
      document.category,
      'farm', // For now, assume farm - this can be enhanced later
      useHybridOCR
    );
  } catch (error) {
    console.error('Failed to retry extraction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Maps extracted data to form fields based on client type
 */
export const mapExtractedDataToFormFields = (
  extractedData: any, 
  clientType: ClientType = 'farm'
) => {
  const mappedData: any = {};

  if (clientType === 'farm') {
    // Farm-specific mapping
    if (extractedData.farm_name) mappedData.name = extractedData.farm_name;
    if (extractedData.owner_name) mappedData.ownerName = extractedData.owner_name;
    if (extractedData.address) mappedData.address = extractedData.address;
    if (extractedData.total_hectares) mappedData.total_hectares = extractedData.total_hectares;
    if (extractedData.legal_status) mappedData.legal_status = extractedData.legal_status;
    if (extractedData.registration_number) mappedData.cnp_or_cui = extractedData.registration_number;
    if (extractedData.revenue) mappedData.revenue = extractedData.revenue;
    if (extractedData.certifications && Array.isArray(extractedData.certifications)) {
      mappedData.certifications = extractedData.certifications;
    }
    if (extractedData.land_use_types && Array.isArray(extractedData.land_use_types)) {
      mappedData.land_use_types = extractedData.land_use_types;
    }
  } else if (clientType === 'business') {
    // Business-specific mapping
    if (extractedData.company_name) mappedData.name = extractedData.company_name;
    if (extractedData.legal_form) mappedData.legal_status = extractedData.legal_form;
    if (extractedData.registration_number) mappedData.registration_number = extractedData.registration_number;
    if (extractedData.tax_id) mappedData.tax_id = extractedData.tax_id;
    if (extractedData.address) mappedData.address = extractedData.address;
    if (extractedData.annual_revenue) mappedData.revenue = extractedData.annual_revenue;
    if (extractedData.industry_sector) mappedData.sector = extractedData.industry_sector;
  } else if (clientType === 'individual') {
    // Individual-specific mapping
    if (extractedData.full_name) mappedData.name = extractedData.full_name;
    if (extractedData.address) mappedData.address = extractedData.address;
    if (extractedData.national_id) mappedData.national_id = extractedData.national_id;
    if (extractedData.tax_number) mappedData.tax_number = extractedData.tax_number;
    if (extractedData.income) mappedData.income = extractedData.income;
    if (extractedData.employment_status) mappedData.employment_status = extractedData.employment_status;
  } else if (clientType === 'municipality') {
    // Municipality-specific mapping
    if (extractedData.municipality_name) mappedData.name = extractedData.municipality_name;
    if (extractedData.administrative_level) mappedData.level = extractedData.administrative_level;
    if (extractedData.mayor_name) mappedData.mayor = extractedData.mayor_name;
    if (extractedData.population) mappedData.population = extractedData.population;
    if (extractedData.budget) mappedData.budget = extractedData.budget;
  } else if (clientType === 'ngo') {
    // NGO-specific mapping
    if (extractedData.organization_name) mappedData.name = extractedData.organization_name;
    if (extractedData.legal_status) mappedData.legal_status = extractedData.legal_status;
    if (extractedData.registration_number) mappedData.registration_number = extractedData.registration_number;
    if (extractedData.mission_statement) mappedData.mission = extractedData.mission_statement;
    if (extractedData.activities) mappedData.activities = extractedData.activities;
  }

  return mappedData;
};

/**
 * Get cost comparison between hybrid and pure OpenAI approaches
 */
export const getCostComparison = (documentPages: number = 1, tokensEstimate: number = 3000) => {
  const hybridCost = {
    googleVision: documentPages * 0.0015, // $0.0015 per page
    openai: (tokensEstimate / 1000) * 0.03, // ~$0.03 per 1K tokens
    total: (documentPages * 0.0015) + ((tokensEstimate / 1000) * 0.03)
  };

  const pureOpenAICost = {
    openai: (tokensEstimate * 2 / 1000) * 0.03, // Double tokens for OCR + extraction
    total: (tokensEstimate * 2 / 1000) * 0.03
  };

  return {
    hybrid: hybridCost,
    pureOpenAI: pureOpenAICost,
    savings: pureOpenAICost.total - hybridCost.total,
    savingsPercentage: ((pureOpenAICost.total - hybridCost.total) / pureOpenAICost.total) * 100
  };
};