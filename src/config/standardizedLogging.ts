/**
 * Standardized logging configuration for AgriTool
 * Unified error handling and rate limiting
 */

import { logger } from '@/lib/logger';

// Standardized error codes
export const ERROR_CODES = {
  // API Errors
  API_RATE_LIMIT: 'E_API_RATE_LIMIT',
  API_TIMEOUT: 'E_API_TIMEOUT', 
  API_INVALID_RESPONSE: 'E_API_INVALID_RESPONSE',
  
  // Extraction Errors
  EXTRACTION_FAILED: 'E_EXTRACTION_FAILED',
  EXTRACTION_TIMEOUT: 'E_EXTRACTION_TIMEOUT',
  EXTRACTION_VALIDATION: 'E_EXTRACTION_VALIDATION',
  
  // Document Errors
  DOCUMENT_PARSE_FAILED: 'E_DOCUMENT_PARSE_FAILED',
  DOCUMENT_TOO_LARGE: 'E_DOCUMENT_TOO_LARGE',
  DOCUMENT_UNSUPPORTED: 'E_DOCUMENT_UNSUPPORTED',
  
  // Database Errors
  DATABASE_CONNECTION: 'E_DATABASE_CONNECTION',
  DATABASE_QUERY: 'E_DATABASE_QUERY',
  DATABASE_VALIDATION: 'E_DATABASE_VALIDATION',
  
  // Configuration Errors
  CONFIG_MISSING: 'E_CONFIG_MISSING',
  CONFIG_INVALID: 'E_CONFIG_INVALID'
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  OPENAI_API: {
    requests_per_minute: 60,
    tokens_per_minute: 200000,
    backoff_multiplier: 2,
    max_retries: 3
  },
  SUPABASE_API: {
    requests_per_minute: 1000,
    backoff_multiplier: 1.5,
    max_retries: 5
  },
  DOCUMENT_PROCESSING: {
    concurrent_extractions: 5,
    backoff_multiplier: 1.5,
    max_retries: 3
  }
} as const;

// Standardized error logging
export const logError = (
  code: keyof typeof ERROR_CODES,
  message: string,
  context?: Record<string, any>,
  error?: Error
) => {
  logger.error(`${ERROR_CODES[code]}: ${message}`, error, {
    errorCode: ERROR_CODES[code],
    timestamp: new Date().toISOString(),
    ...context
  });
};

// Standardized success logging
export const logSuccess = (
  operation: string,
  message: string,
  context?: Record<string, any>
) => {
  logger.success(`${operation}: ${message}`, {
    operation,
    timestamp: new Date().toISOString(),
    ...context
  });
};

// Standardized rate limit handling
export const handleRateLimit = async (
  operation: string,
  attempt: number,
  maxRetries: number,
  backoffMultiplier: number
): Promise<void> => {
  if (attempt >= maxRetries) {
    logError('API_RATE_LIMIT', `Max retries exceeded for ${operation}`, {
      operation,
      attempt,
      maxRetries
    });
    throw new Error(`Rate limit exceeded for ${operation} after ${maxRetries} attempts`);
  }

  const delay = Math.pow(backoffMultiplier, attempt) * 1000;
  logger.warn(`Rate limit hit for ${operation}, retrying in ${delay}ms`, {
    operation,
    attempt,
    delay
  });
  
  await new Promise(resolve => setTimeout(resolve, delay));
};

// Retry wrapper with exponential backoff
export const withRetry = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  config = RATE_LIMITS.SUPABASE_API
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < config.max_retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a rate limit error
      if (error instanceof Error && error.message.includes('rate limit')) {
        await handleRateLimit(operationName, attempt, config.max_retries, config.backoff_multiplier);
        continue;
      }
      
      // For other errors, log and retry with backoff
      if (attempt < config.max_retries - 1) {
        logger.warn(`${operationName} failed, retrying...`, {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error)
        });
        
        const delay = Math.pow(config.backoff_multiplier, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logError('API_TIMEOUT', `Operation failed after ${config.max_retries} attempts`, {
    operation: operationName
  }, lastError);
  
  throw lastError;
};