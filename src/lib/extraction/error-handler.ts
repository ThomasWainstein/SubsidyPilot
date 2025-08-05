/**
 * Production-ready error handling for extraction pipeline
 * Replaces all mock fallbacks with proper error handling
 */

import { logger } from '@/lib/logger';
import { IS_DEVELOPMENT } from '@/config/environment';

export interface ExtractionError {
  type: 'network' | 'parsing' | 'validation' | 'service' | 'unknown';
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
  recoverable: boolean;
}

export interface ExtractionResult {
  success: boolean;
  data?: any;
  error?: ExtractionError;
  extractionId?: string;
}

export class ExtractionErrorHandler {
  private static instance: ExtractionErrorHandler;
  
  static getInstance(): ExtractionErrorHandler {
    if (!ExtractionErrorHandler.instance) {
      ExtractionErrorHandler.instance = new ExtractionErrorHandler();
    }
    return ExtractionErrorHandler.instance;
  }

  /**
   * Handles extraction failures with proper error classification
   * NEVER returns mock data - always surfaces real errors
   */
  handleExtractionFailure(
    error: any, 
    context: { documentId: string; fileName: string; documentType?: string }
  ): ExtractionResult {
    
    const extractionError = this.classifyError(error, context);
    
    // Log the error appropriately
    logger.error('Extraction failed', error, {
      documentId: context.documentId,
      fileName: context.fileName,
      errorType: extractionError.type,
      recoverable: extractionError.recoverable
    });

    // In development, provide detailed error info
    if (IS_DEVELOPMENT) {
      logger.debug('Full extraction error details', {
        originalError: error,
        stack: error?.stack,
        context
      });
    }

    return {
      success: false,
      error: extractionError
    };
  }

  /**
   * Classifies errors for better user experience and debugging
   */
  private classifyError(error: any, context: Record<string, any>): ExtractionError {
    let errorType: ExtractionError['type'] = 'unknown';
    let message = 'Extraction failed unexpectedly';
    let recoverable = false;

    if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
      errorType = 'network';
      message = 'Unable to connect to extraction service. Please check your internet connection and try again.';
      recoverable = true;
    } else if (error?.message?.includes('timeout') || error?.code === 'TIMEOUT') {
      errorType = 'network';
      message = 'Extraction service timed out. Please try again with a smaller document.';
      recoverable = true;
    } else if (error?.status === 413 || error?.message?.includes('file too large')) {
      errorType = 'validation';
      message = 'Document file is too large. Please use a smaller file (max 10MB).';
      recoverable = false;
    } else if (error?.status === 415 || error?.message?.includes('unsupported')) {
      errorType = 'validation';
      message = 'Unsupported file format. Please use PDF, DOCX, or image files.';
      recoverable = false;
    } else if (error?.status === 429) {
      errorType = 'service';
      message = 'Too many requests. Please wait a moment and try again.';
      recoverable = true;
    } else if (error?.status >= 500) {
      errorType = 'service';
      message = 'Extraction service is temporarily unavailable. Please try again later.';
      recoverable = true;
    } else if (error?.status === 400) {
      errorType = 'validation';
      message = 'Unable to process this document. Please ensure it contains readable text and farm information.';
      recoverable = false;
    } else if (error?.message?.includes('parse') || error?.message?.includes('format')) {
      errorType = 'parsing';
      message = 'Unable to read document content. Please ensure the file is not corrupted.';
      recoverable = false;
    }

    return {
      type: errorType,
      message,
      originalError: error instanceof Error ? error : new Error(String(error)),
      context,
      timestamp: new Date(),
      recoverable
    };
  }

  /**
   * Provides user-friendly error messages and recovery suggestions
   */
  getErrorDisplayInfo(error: ExtractionError): {
    title: string;
    message: string;
    actions: Array<{ label: string; action: string }>;
  } {
    const baseActions = [
      { label: 'Try Again', action: 'retry' },
      { label: 'Fill Manually', action: 'manual' }
    ];

    switch (error.type) {
      case 'network':
        return {
          title: 'Connection Issue',
          message: error.message,
          actions: error.recoverable 
            ? [{ label: 'Retry', action: 'retry' }, ...baseActions]
            : baseActions
        };
      
      case 'validation':
        return {
          title: 'Document Issue',
          message: error.message,
          actions: [
            { label: 'Choose Different File', action: 'reselect' },
            { label: 'Fill Manually', action: 'manual' }
          ]
        };
      
      case 'service':
        return {
          title: 'Service Unavailable',
          message: error.message,
          actions: error.recoverable
            ? [{ label: 'Try Again Later', action: 'retry' }, ...baseActions]
            : baseActions
        };
      
      case 'parsing':
        return {
          title: 'Document Processing Error',
          message: error.message,
          actions: [
            { label: 'Try Different Format', action: 'reselect' },
            { label: 'Fill Manually', action: 'manual' }
          ]
        };
      
      default:
        return {
          title: 'Extraction Failed',
          message: 'Something went wrong during document processing.',
          actions: baseActions
        };
    }
  }

  /**
   * Determines if an operation should be retried based on error type
   */
  shouldRetry(error: ExtractionError, attemptCount: number): boolean {
    if (attemptCount >= 3) return false;
    
    return error.recoverable && (
      error.type === 'network' || 
      error.type === 'service'
    );
  }
}

export const extractionErrorHandler = ExtractionErrorHandler.getInstance();