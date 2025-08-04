import { IS_PRODUCTION, FEATURES } from '@/config/environment';
import { logger } from '@/lib/logger';

/**
 * Production safety guards to prevent development/test code from running in production
 */

export class ProductionViolationError extends Error {
  constructor(message: string) {
    super(`Production Violation: ${message}`);
    this.name = 'ProductionViolationError';
  }
}

/**
 * Prevents mock data from being used in production
 */
export const guardAgainstMockData = (context: string) => {
  if (IS_PRODUCTION && !FEATURES.ALLOW_MOCK_DATA) {
    const error = new ProductionViolationError(
      `Mock data attempted in production context: ${context}`
    );
    logger.error('Mock data blocked in production', error, { context });
    throw error;
  }
};

/**
 * Prevents test utilities from running in production
 */
export const guardAgainstTestCode = (context: string) => {
  if (IS_PRODUCTION && !FEATURES.TESTING_MODE) {
    const error = new ProductionViolationError(
      `Test code attempted in production context: ${context}`
    );
    logger.error('Test code blocked in production', error, { context });
    throw error;
  }
};

/**
 * Safe wrapper for development-only code
 */
export const developmentOnly = <T>(fn: () => T, fallback?: T): T | undefined => {
  if (IS_PRODUCTION) {
    logger.warn('Development-only code skipped in production');
    return fallback;
  }
  return fn();
};

/**
 * Validates that extraction data is not mock/test data
 */
export const validateExtractionDataIntegrity = (data: any, source: string) => {
  if (IS_PRODUCTION) {
    // Check for common test data indicators
    const testIndicators = [
      'test-', 'mock-', 'fake-', 'dummy-',
      'Test Farm', 'Mock Farm', 'Example Farm',
      'test@example.com', 'mock@test.com'
    ];
    
    const dataString = JSON.stringify(data).toLowerCase();
    const hasTestIndicators = testIndicators.some(indicator => 
      dataString.includes(indicator.toLowerCase())
    );
    
    if (hasTestIndicators) {
      const error = new ProductionViolationError(
        `Suspected test data in production extraction from ${source}`
      );
      logger.error('Test data detected in production', error, { 
        source, 
        hasTestData: hasTestIndicators 
      });
      throw error;
    }
  }
};

/**
 * Production-safe error handler that doesn't expose sensitive information
 */
export const safeProductionError = (error: unknown, context: string): Error => {
  if (IS_PRODUCTION) {
    // In production, sanitize error messages
    logger.error('Production error sanitized', error instanceof Error ? error : new Error(String(error)), { context });
    return new Error(`An error occurred in ${context}. Please check system logs.`);
  } else {
    // In development, return full error details
    return error instanceof Error ? error : new Error(String(error));
  }
};

export default {
  guardAgainstMockData,
  guardAgainstTestCode,
  developmentOnly,
  validateExtractionDataIntegrity,
  safeProductionError,
  ProductionViolationError,
};