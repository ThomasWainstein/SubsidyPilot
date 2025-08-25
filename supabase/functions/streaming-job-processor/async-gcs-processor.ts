// Async GCS-based document processing for large files
import { ErrorTaxonomy, ErrorCode } from './error-taxonomy.ts';
import { CostMonitor } from './cost-monitoring.ts';

export interface GCSConfig {
  bucketName: string;
  projectId: string;
  credentials: any;
}

export interface AsyncProcessingRequest {
  documentId: string;
  jobId: string;
  fileUrl: string;
  fileName: string;
  correlationId: string;
  tenantId?: string;
}

export class AsyncGCSProcessor {
  private config: GCSConfig;

  constructor(config: GCSConfig) {
    this.config = config;
  }

  static shouldUseAsync(fileSize: number, pageCount?: number): boolean {
    // Use async for files >10MB or >50 pages to avoid memory issues
    return fileSize > 10 * 1024 * 1024 || (pageCount && pageCount > 50);
  }

  async processLargeDocument(request: AsyncProcessingRequest): Promise<{
    operationName: string;
    gcsInputPath: string;
    gcsOutputPath: string;
  }> {
    console.log(`🔄 Starting async GCS processing for ${request.documentId}`);

    try {
      // 1. Upload file to GCS
      const gcsInputPath = await this.uploadToGCS(request);
      console.log(`📤 Uploaded to GCS: ${gcsInputPath}`);

      // 2. Start async batch annotation
      const operationName = await this.startAsyncBatchAnnotation(
        gcsInputPath,
        request.correlationId
      );
      console.log(`🔄 Started async operation: ${operationName}`);

      // 3. Return operation details for polling
      const gcsOutputPath = `gs://${this.config.bucketName}/output/${request.correlationId}/`;
      
      return {
        operationName,
        gcsInputPath,
        gcsOutputPath
      };

    } catch (error) {
      console.error('❌ Async GCS processing failed:', error);
      throw ErrorTaxonomy.createError(
        ErrorTaxonomy.categorizeError(error),
        error,
        { 
          correlationId: request.correlationId,
          gcsProcessing: true 
        },
        {
          stage: 'async-gcs-setup',
          jobId: request.jobId,
          tenantId: request.tenantId
        }
      );
    }
  }

  private async uploadToGCS(request: AsyncProcessingRequest): Promise<string> {
    // Download file first
    const response = await fetch(request.fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    const fileBuffer = await response.arrayBuffer();
    const fileName = `input/${request.correlationId}/${request.fileName}`;
    const gcsPath = `gs://${this.config.bucketName}/${fileName}`;

    // Upload to GCS using signed URL approach
    const uploadUrl = await this.getSignedUploadUrl(fileName);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: fileBuffer,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`GCS upload failed: ${uploadResponse.status}`);
    }

    return gcsPath;
  }

  private async getSignedUploadUrl(fileName: string): Promise<string> {
    // This would generate a signed URL for GCS upload
    // For now, return a placeholder - in production this would use GCS client
    throw new Error('Signed URL generation not implemented - requires GCS client library');
  }

  private async startAsyncBatchAnnotation(
    gcsInputPath: string,
    correlationId: string
  ): Promise<string> {
    const accessToken = await this.getAccessToken();
    const outputPrefix = `gs://${this.config.bucketName}/output/${correlationId}/`;

    const requestPayload = {
      requests: [{
        inputConfig: {
          gcsSource: {
            uri: gcsInputPath
          },
          mimeType: 'application/pdf'
        },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION' }
        ],
        outputConfig: {
          gcsDestination: {
            uri: outputPrefix
          },
          batchSize: 20 // Process in batches
        }
      }]
    };

    // Use EU endpoint for compliance
    const response = await fetch(
      `https://eu-vision.googleapis.com/v1/files:asyncBatchAnnotate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestPayload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Async batch annotation failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.name; // Operation name for polling
  }

  async pollOperationStatus(operationName: string): Promise<{
    done: boolean;
    error?: any;
    response?: any;
  }> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://eu-vision.googleapis.com/v1/operations/${operationName}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to poll operation: ${response.status}`);
    }

    return await response.json();
  }

  async readResultsFromGCS(gcsOutputPath: string): Promise<any[]> {
    // This would read the JSON output files from GCS
    // For now, return placeholder - in production this would use GCS client
    console.log(`📥 Reading results from: ${gcsOutputPath}`);
    throw new Error('GCS result reading not implemented - requires GCS client library');
  }

  private async getAccessToken(): Promise<string> {
    // Reuse the JWT signing logic from main processor
    const now = Math.floor(Date.now() / 1000);
    
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.config.credentials.private_key_id
    };
    
    const payload = {
      iss: this.config.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };
    
    // JWT signing implementation would go here
    // For now, throw error - this needs the full JWT implementation
    throw new Error('JWT signing not implemented in this module');
  }

  async estimateCostAsync(fileSize: number, pageCount: number): Promise<{
    estimatedCost: number;
    savings: number;
    recommendation: string;
  }> {
    const syncCost = CostMonitor.estimateVisionCost(pageCount, fileSize);
    const asyncCost = syncCost * 0.8; // 20% savings with async processing
    const savings = syncCost - asyncCost;

    return {
      estimatedCost: asyncCost,
      savings,
      recommendation: `Async processing saves $${savings.toFixed(4)} (20% reduction) and prevents memory issues for large files`
    };
  }
}

// Policy engine for routing decisions
export class ProcessingPolicyEngine {
  private static readonly POLICIES = {
    size_threshold_mb: 10,
    page_threshold: 50,
    max_cost_per_doc: 10.0,
    eu_endpoint_required: true,
    async_preferred_over_mb: 25
  };

  static shouldUseAsync(fileSize: number, pageCount?: number): {
    useAsync: boolean;
    reason: string;
    policy: string;
  } {
    const sizeMB = fileSize / (1024 * 1024);

    if (sizeMB > this.POLICIES.size_threshold_mb) {
      return {
        useAsync: true,
        reason: `File size ${sizeMB.toFixed(1)}MB exceeds ${this.POLICIES.size_threshold_mb}MB threshold`,
        policy: 'size_threshold_mb'
      };
    }

    if (pageCount && pageCount > this.POLICIES.page_threshold) {
      return {
        useAsync: true,
        reason: `Page count ${pageCount} exceeds ${this.POLICIES.page_threshold} page threshold`,
        policy: 'page_threshold'
      };
    }

    if (sizeMB > this.POLICIES.async_preferred_over_mb) {
      return {
        useAsync: true,
        reason: `Large file ${sizeMB.toFixed(1)}MB benefits from async processing`,
        policy: 'async_preferred_over_mb'
      };
    }

    return {
      useAsync: false,
      reason: `File size ${sizeMB.toFixed(1)}MB and ${pageCount || 'unknown'} pages suitable for sync processing`,
      policy: 'sync_preferred'
    };
  }

  static getEndpointUrl(): string {
    return this.POLICIES.eu_endpoint_required 
      ? 'https://eu-vision.googleapis.com'
      : 'https://vision.googleapis.com';
  }

  static validateCostLimit(estimatedCost: number): {
    allowed: boolean;
    reason?: string;
  } {
    if (estimatedCost > this.POLICIES.max_cost_per_doc) {
      return {
        allowed: false,
        reason: `Estimated cost $${estimatedCost.toFixed(4)} exceeds limit of $${this.POLICIES.max_cost_per_doc}`
      };
    }

    return { allowed: true };
  }
}