import { triggerExtraction, retryExtraction, mapExtractedDataToFormFields, type ClientType } from '@/lib/services/unified-extraction-service';

export type { ClientType } from '@/lib/services/unified-extraction-service';

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
}

export const triggerDocumentExtraction = async (
  documentId: string,
  fileUrl: string,
  fileName: string,
  documentType: string,
  clientType: ClientType = 'farm',
  useHybridOCR: boolean = true
): Promise<ExtractionResult> => {
  return triggerExtraction(documentId, fileUrl, fileName, documentType, clientType, useHybridOCR);
};

export const retryDocumentExtraction = async (
  documentId: string,
  useHybridOCR: boolean = true
): Promise<ExtractionResult> => {
  return retryExtraction(documentId, useHybridOCR);
};

export { mapExtractedDataToFormFields };