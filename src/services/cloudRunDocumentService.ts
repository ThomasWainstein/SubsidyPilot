/**
 * Cloud Run Document Processing Service
 * Integrates with the Google Cloud Run subsidypilot-form-parser service
 */

export interface CloudRunProcessingRequest {
  documentId: string;
  fileUrl: string;
  fileName: string;
  documentType?: string;
  extractionOptions?: {
    includeOCR?: boolean;
    confidenceThreshold?: number;
    extractTables?: boolean;
    extractImages?: boolean;
  };
}

export interface CloudRunProcessingResponse {
  success: boolean;
  extractedData?: any;
  confidence?: number;
  processingTime?: number;
  metadata?: {
    model?: string;
    version?: string;
    extractionMethod?: string;
  };
  error?: string;
}

class CloudRunDocumentService {
  private readonly baseUrl = 'https://subsidypilot-form-parser-838836299668.europe-west1.run.app';
  private readonly timeout = 300000; // 5 minutes

  /**
   * Process document using Cloud Run service
   */
  async processDocument(request: CloudRunProcessingRequest): Promise<CloudRunProcessingResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Sending document to Cloud Run service: ${request.fileName}`);
      
      const response = await fetch(`${this.baseUrl}/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          document_id: request.documentId,
          file_url: request.fileUrl,
          file_name: request.fileName,
          document_type: request.documentType || 'general',
          extraction_options: {
            include_ocr: request.extractionOptions?.includeOCR ?? true,
            confidence_threshold: request.extractionOptions?.confidenceThreshold ?? 0.7,
            extract_tables: request.extractionOptions?.extractTables ?? true,
            extract_images: request.extractionOptions?.extractImages ?? false,
          }
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloud Run service error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      console.log(`✅ Cloud Run processing completed in ${processingTime}ms`);
      
      return {
        success: true,
        extractedData: result.extracted_data,
        confidence: result.confidence_score,
        processingTime,
        metadata: {
          model: result.model_used,
          version: result.version,
          extractionMethod: 'cloud-run-advanced'
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Cloud Run processing failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime
      };
    }
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<{ healthy: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout for health check
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { healthy: true, responseTime };
      } else {
        return { 
          healthy: false, 
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Get service configuration and capabilities
   */
  async getServiceInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return await response.json();
      }
      
      return null;
    } catch (error) {
      console.warn('Could not retrieve service info:', error);
      return null;
    }
  }
}

// Singleton instance
let cloudRunServiceInstance: CloudRunDocumentService | null = null;

export const getCloudRunDocumentService = (): CloudRunDocumentService => {
  if (!cloudRunServiceInstance) {
    cloudRunServiceInstance = new CloudRunDocumentService();
  }
  return cloudRunServiceInstance;
};

export { CloudRunDocumentService };