/**
 * Production-ready validation and enhancement utilities for document extraction
 */

export interface FileValidationResult {
  isValid: boolean;
  fileType: string;
  fileSize: number;
  mimeType?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Validate file before extraction
 */
export async function validateDocumentFile(fileUrl: string, fileName: string): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: false,
    fileType: 'unknown',
    fileSize: 0,
    errors: [],
    warnings: []
  };

  try {
    // Fetch file headers to check size and type
    const response = await fetch(fileUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      result.errors.push(`File not accessible: ${response.status} ${response.statusText}`);
      return result;
    }

    // Check file size
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      result.fileSize = parseInt(contentLength);
      
      // Edge function memory limit consideration
      if (result.fileSize > 50 * 1024 * 1024) { // 50MB
        result.warnings.push('File is very large (>50MB) - may cause timeout in edge function');
      }
      
      if (result.fileSize > 150 * 1024 * 1024) { // 150MB
        result.errors.push('File too large (>150MB) - exceeds edge function memory limit');
        return result;
      }
    }

    // Check MIME type
    const contentType = response.headers.get('content-type');
    if (contentType) {
      result.mimeType = contentType;
      
      if (fileName.toLowerCase().endsWith('.docx')) {
        const validMimeTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/octet-stream', // Sometimes servers return this for DOCX
          'application/zip' // DOCX files are ZIP archives
        ];
        
        if (!validMimeTypes.some(type => contentType.includes(type))) {
          result.warnings.push(`Unexpected MIME type for DOCX: ${contentType}`);
        }
      }
    }

    // Determine file type from extension
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'docx':
        result.fileType = 'docx';
        break;
      case 'pdf':
        result.fileType = 'pdf';
        break;
      case 'xlsx':
      case 'xls':
        result.fileType = 'xlsx';
        break;
      case 'txt':
      case 'csv':
        result.fileType = 'text';
        break;
      default:
        result.errors.push(`Unsupported file type: ${extension}`);
        return result;
    }

    result.isValid = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`File validation failed: ${(error as Error).message}`);
    return result;
  }
}

/**
 * Enhanced DOCX validation with header check
 */
export async function validateDocxFile(fileBuffer: ArrayBuffer): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: false,
    fileType: 'docx',
    fileSize: fileBuffer.byteLength,
    errors: [],
    warnings: []
  };

  try {
    // Check DOCX magic bytes (ZIP signature)
    const uint8Array = new Uint8Array(fileBuffer);
    const zipSignature = [0x50, 0x4B, 0x03, 0x04]; // PK..
    
    const hasZipSignature = zipSignature.every((byte, index) => uint8Array[index] === byte);
    
    if (!hasZipSignature) {
      result.errors.push('File does not have valid DOCX/ZIP signature');
      return result;
    }

    // Convert to text to check for DOCX-specific content
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const text = decoder.decode(fileBuffer.slice(0, 1024)); // Check first 1KB

    // Look for DOCX-specific markers
    const docxMarkers = [
      'word/document.xml',
      'docProps',
      'word/_rels',
      '[Content_Types].xml'
    ];

    const hasDocxMarkers = docxMarkers.some(marker => text.includes(marker));
    
    if (!hasDocxMarkers) {
      result.warnings.push('File may not be a valid DOCX document - missing expected internal structure');
    }

    result.isValid = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`DOCX validation failed: ${(error as Error).message}`);
    return result;
  }
}

/**
 * Rate limiting for extraction requests
 */
export class ExtractionRateLimiter {
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) { // 10 requests per minute by default
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  checkRateLimit(identifier: string): { allowed: boolean; remainingRequests: number; resetTime: number } {
    const now = Date.now();
    const userRequests = this.requestCounts.get(identifier);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or initialize
      this.requestCounts.set(identifier, { 
        count: 1, 
        resetTime: now + this.windowMs 
      });
      return { 
        allowed: true, 
        remainingRequests: this.maxRequests - 1, 
        resetTime: now + this.windowMs 
      };
    }

    if (userRequests.count >= this.maxRequests) {
      return { 
        allowed: false, 
        remainingRequests: 0, 
        resetTime: userRequests.resetTime 
      };
    }

    userRequests.count++;
    return { 
      allowed: true, 
      remainingRequests: this.maxRequests - userRequests.count, 
      resetTime: userRequests.resetTime 
    };
  }
}

/**
 * Progress tracking for long-running extractions
 */
export interface ExtractionProgress {
  stage: 'validating' | 'downloading' | 'extracting' | 'processing' | 'storing' | 'complete';
  progress: number; // 0-100
  message: string;
  timestamp: number;
}

export class ExtractionProgressTracker {
  private progressCallbacks = new Map<string, (progress: ExtractionProgress) => void>();

  registerProgress(extractionId: string, callback: (progress: ExtractionProgress) => void) {
    this.progressCallbacks.set(extractionId, callback);
  }

  updateProgress(extractionId: string, stage: ExtractionProgress['stage'], progress: number, message: string) {
    const callback = this.progressCallbacks.get(extractionId);
    if (callback) {
      callback({
        stage,
        progress,
        message,
        timestamp: Date.now()
      });
    }
  }

  completeProgress(extractionId: string) {
    this.progressCallbacks.delete(extractionId);
  }
}