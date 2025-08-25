// Structured error taxonomy for production-grade error handling
export enum ErrorCode {
  // File & Encoding Errors
  FILE_DOWNLOAD_FAILED = 'FILE_DOWNLOAD_FAILED',
  FILE_URL_INVALID_SCHEME = 'FILE_URL_INVALID_SCHEME',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  ENCODING_FAIL = 'ENCODING_FAIL',
  MIME_UNSUPPORTED = 'MIME_UNSUPPORTED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  
  // Authentication & API Errors
  AUTH_OAUTH_FAIL = 'AUTH_OAUTH_FAIL',
  AUTH_SERVICE_ACCOUNT_INVALID = 'AUTH_SERVICE_ACCOUNT_INVALID',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  
  // Google Vision API Errors
  VISION_API_ERROR = 'VISION_API_ERROR',
  QUOTA_EXCEEDED_429 = 'QUOTA_EXCEEDED_429',
  RATE_LIMITED = 'RATE_LIMITED',
  VISION_TIMEOUT = 'VISION_TIMEOUT',
  VISION_5XX = 'VISION_5XX',
  
  // Processing Errors
  OCR_NO_TEXT = 'OCR_NO_TEXT',
  OCR_LOW_CONFIDENCE = 'OCR_LOW_CONFIDENCE',
  AI_PROCESSING_FAILED = 'AI_PROCESSING_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  
  // Infrastructure Errors
  TIMEOUT = 'TIMEOUT',
  MEMORY_LIMIT = 'MEMORY_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Unknown/Uncategorized
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ProcessingError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryDelay?: number; // milliseconds
  severity: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  source: 'USER' | 'SYSTEM' | 'EXTERNAL';
  stage?: string;
  httpStatus?: number;
  correlationId: string;
  tenantId?: string;
  jobId?: string;
  attempt?: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export class ErrorTaxonomy {
  static createError(
    code: ErrorCode,
    originalError: any,
    metadata?: Record<string, any>,
    options?: {
      stage?: string;
      tenantId?: string;
      jobId?: string;
      attempt?: number;
      httpStatus?: number;
    }
  ): ProcessingError {
    const baseError = this.getErrorTemplate(code);
    
    return {
      ...baseError,
      message: originalError?.message || baseError.message,
      correlationId: metadata?.correlationId || crypto.randomUUID(),
      stage: options?.stage,
      tenantId: options?.tenantId,
      jobId: options?.jobId,
      attempt: options?.attempt,
      httpStatus: options?.httpStatus,
      metadata: {
        ...metadata,
        originalStack: originalError?.stack,
        originalMessage: originalError?.message
      },
      timestamp: new Date().toISOString()
    };
  }

  private static getErrorTemplate(code: ErrorCode): Omit<ProcessingError, 'timestamp' | 'message' | 'correlationId'> {
    const templates: Record<ErrorCode, Omit<ProcessingError, 'timestamp' | 'message' | 'correlationId'>> = {
      [ErrorCode.FILE_DOWNLOAD_FAILED]: {
        code,
        userMessage: "Unable to download the document. Please check the file URL and try again.",
        retryable: true,
        retryDelay: 5000,
        severity: 'ERROR',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.FILE_URL_INVALID_SCHEME]: {
        code,
        userMessage: "Invalid file URL detected. Please upload the file first for processing.",
        retryable: false,
        retryDelay: 0,
        severity: 'WARN',
        source: 'USER'
      },
      
      [ErrorCode.PAYLOAD_TOO_LARGE]: {
        code,
        userMessage: "File is too large for synchronous processing. Please use a smaller file or contact support.",
        retryable: false,
        retryDelay: 0,
        severity: 'WARN',
        source: 'USER'
      },
      
      [ErrorCode.FILE_TOO_LARGE]: {
        code,
        userMessage: "Document is too large for processing. Maximum size is 50MB. Consider using a smaller file or splitting the document.",
        retryable: false,
        severity: 'ERROR',
        source: 'USER'
      },
      
      [ErrorCode.FILE_CORRUPTED]: {
        code,
        userMessage: "The document appears to be corrupted or encrypted. Please upload a valid, unprotected file.",
        retryable: false,
        severity: 'ERROR',
        source: 'USER'
      },
      
      [ErrorCode.ENCODING_FAIL]: {
        code,
        userMessage: "Failed to process the document format. Please try uploading again or use a different file format.",
        retryable: true,
        retryDelay: 3000,
        severity: 'WARN',
        source: 'SYSTEM'
      },
      
      [ErrorCode.MIME_UNSUPPORTED]: {
        code,
        userMessage: "File type not supported. Please upload PDF, DOCX, XLSX, or image files only.",
        retryable: false,
        severity: 'ERROR',
        source: 'USER'
      },
      
      [ErrorCode.AUTH_OAUTH_FAIL]: {
        code,
        userMessage: "Authentication error occurred. Please try again in a few minutes.",
        retryable: true,
        retryDelay: 30000,
        severity: 'ERROR',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.AUTH_SERVICE_ACCOUNT_INVALID]: {
        code,
        userMessage: "Service configuration error. Please contact support.",
        retryable: false,
        severity: 'FATAL',
        source: 'SYSTEM'
      },
      
      [ErrorCode.AUTH_TOKEN_EXPIRED]: {
        code,
        userMessage: "Authentication expired. Retrying with fresh credentials.",
        retryable: true,
        retryDelay: 1000,
        severity: 'WARN',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.QUOTA_EXCEEDED_429]: {
        code,
        userMessage: "Service temporarily at capacity. Your document will be processed shortly.",
        retryable: true,
        retryDelay: 60000, // 1 minute
        severity: 'WARN',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.RATE_LIMITED]: {
        code,
        userMessage: "Processing queue is busy. Your document will be processed shortly.",
        retryable: true,
        retryDelay: 30000,
        severity: 'WARN',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.VISION_TIMEOUT]: {
        code,
        userMessage: "Document processing timed out. This may be due to document complexity. Please try again.",
        retryable: true,
        retryDelay: 10000,
        severity: 'ERROR',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.VISION_5XX]: {
        code,
        userMessage: "Processing service temporarily unavailable. Please try again in a few minutes.",
        retryable: true,
        retryDelay: 120000, // 2 minutes
        severity: 'ERROR',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.OCR_NO_TEXT]: {
        code,
        userMessage: "No readable text found in the document. Please ensure the document contains clear, readable text.",
        retryable: false,
        severity: 'WARN',
        source: 'USER'
      },
      
      [ErrorCode.OCR_LOW_CONFIDENCE]: {
        code,
        userMessage: "Text extraction had low confidence. Results may be incomplete. Consider uploading a clearer version.",
        retryable: false,
        severity: 'WARN',
        source: 'SYSTEM'
      },
      
      [ErrorCode.AI_PROCESSING_FAILED]: {
        code,
        userMessage: "Failed to extract structured data from the document. Please try again or contact support.",
        retryable: true,
        retryDelay: 5000,
        severity: 'ERROR',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.VALIDATION_FAILED]: {
        code,
        userMessage: "Extracted data failed validation. The document may be missing required information.",
        retryable: false,
        severity: 'WARN',
        source: 'SYSTEM'
      },
      
      [ErrorCode.TIMEOUT]: {
        code,
        userMessage: "Processing timed out. Please try again with a smaller or simpler document.",
        retryable: true,
        retryDelay: 15000,
        severity: 'ERROR',
        source: 'SYSTEM'
      },
      
      [ErrorCode.MEMORY_LIMIT]: {
        code,
        userMessage: "Document too complex for current processing limits. Please try a smaller file.",
        retryable: false,
        severity: 'ERROR',
        source: 'SYSTEM'
      },
      
      [ErrorCode.NETWORK_ERROR]: {
        code,
        userMessage: "Network connectivity issue. Please try again.",
        retryable: true,
        retryDelay: 10000,
        severity: 'ERROR',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.DATABASE_ERROR]: {
        code,
        userMessage: "Database error occurred. Please try again.",
        retryable: true,
        retryDelay: 5000,
        severity: 'ERROR',
        source: 'SYSTEM'
      },
      
      [ErrorCode.VISION_API_ERROR]: {
        code,
        userMessage: "Vision processing error. Please try again.",
        retryable: true,
        retryDelay: 5000,
        severity: 'ERROR',
        source: 'EXTERNAL'
      },
      
      [ErrorCode.UNKNOWN_ERROR]: {
        code,
        userMessage: "An unexpected error occurred. Please try again or contact support.",
        retryable: true,
        retryDelay: 10000,
        severity: 'ERROR',
        source: 'SYSTEM'
      }
    };

    return templates[code] || templates[ErrorCode.UNKNOWN_ERROR];
  }

  static categorizeError(error: any): ErrorCode {
    const message = error?.message?.toLowerCase() || '';
    
    // URL scheme issues - catch blob URLs and invalid schemes first
    if (message.includes('only absolute urls are supported') || 
        message.includes('scheme \'blob\' not supported') ||
        message.includes('failed to parse url') ||
        message.includes('blob:') || message.includes('data:') ||
        !/^https?:\/\//i.test(error?.url || '')) {
      return ErrorCode.FILE_URL_INVALID_SCHEME;
    }
    
    // Response parsing issues - catch .text() and .json() method errors
    if (message.includes('.text is not a function') ||
        message.includes('.json is not a function') ||
        message.includes('unexpected end of json') ||
        message.includes('invalid json')) {
      return ErrorCode.VISION_API_ERROR; // Treat as API response issue
    }
    
    // Network and connectivity
    if (message.includes('network') || message.includes('connection') || 
        message.includes('enotfound') || message.includes('timeout') ||
        message.includes('certificate') || message.includes('handshake') ||
        message.includes('name not resolved') || message.includes('cors') ||
        message.includes('failed to fetch')) {
      return ErrorCode.NETWORK_ERROR;
    }
    
    // File access issues
    if (message.includes('file not found') || message.includes('no such file') ||
        message.includes('access denied') || message.includes('signed url') ||
        message.includes('bucket') || error?.status === 403 || 
        message.includes('download')) {
      return ErrorCode.FILE_DOWNLOAD_FAILED;
    }
    
    // Size and payload issues  
    if (message.includes('too large') || message.includes('size limit') ||
        message.includes('maximum') && message.includes('size') ||
        message.includes('payload') && message.includes('large') ||
        message.includes('file too large') || message.includes('payload too large')) {
      return ErrorCode.FILE_TOO_LARGE;
    }
    
    // Encoding issues
    if (message.includes('base64') || message.includes('encoding')) {
      return ErrorCode.ENCODING_FAIL;
    }
    
    // File corruption
    if (message.includes('corrupted') || message.includes('invalid pdf') || message.includes('password')) {
      return ErrorCode.FILE_CORRUPTED;
    }
    
    // Auth errors
    if (message.includes('unauthorized') || message.includes('invalid_grant') || message.includes('token')) {
      if (message.includes('expired')) return ErrorCode.AUTH_TOKEN_EXPIRED;
      return ErrorCode.AUTH_OAUTH_FAIL;
    }
    
    if (message.includes('service account') || message.includes('invalid_key')) {
      return ErrorCode.AUTH_SERVICE_ACCOUNT_INVALID;
    }
    
    // Vision API specific errors
    if (message.includes('quota') || message.includes('429')) {
      return ErrorCode.QUOTA_EXCEEDED_429;
    }
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCode.RATE_LIMITED;
    }
    
    if (message.includes('timeout') || message.includes('deadline')) {
      return ErrorCode.VISION_TIMEOUT;
    }
    
    if (message.includes('5') && (message.includes('500') || message.includes('502') || message.includes('503'))) {
      return ErrorCode.VISION_5XX;
    }
    
    if (message.includes('vision') || message.includes('google cloud')) {
      return ErrorCode.VISION_API_ERROR;
    }
    
    // Processing errors
    if (message.includes('no text') || message.includes('empty result')) {
      return ErrorCode.OCR_NO_TEXT;
    }
    
    if (message.includes('low confidence') || message.includes('poor quality')) {
      return ErrorCode.OCR_LOW_CONFIDENCE;
    }
    
    if (message.includes('memory') || message.includes('out of memory')) {
      return ErrorCode.MEMORY_LIMIT;
    }
    
    if (message.includes('validation')) {
      return ErrorCode.VALIDATION_FAILED;
    }
    
    // Database errors
    if (message.includes('database') || message.includes('sql') || message.includes('supabase')) {
      return ErrorCode.DATABASE_ERROR;
    }
    
    return ErrorCode.UNKNOWN_ERROR;
  }

  static shouldRetry(error: ProcessingError, currentAttempt: number, maxAttempts: number = 3): boolean {
    if (currentAttempt >= maxAttempts) return false;
    return error.retryable;
  }

  static getRetryDelay(error: ProcessingError, attempt: number): number {
    const baseDelay = error.retryDelay || 5000;
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Up to 1 second jitter
    return exponentialDelay + jitter;
  }
}