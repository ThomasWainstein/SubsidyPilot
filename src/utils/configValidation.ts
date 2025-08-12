/**
 * Configuration validation utilities
 * Ensures no hardcoded secrets and validates environment setup
 */

import { logger } from '@/lib/logger';
import { IS_PRODUCTION } from '@/config/environment';

// Environment variables that should never be hardcoded
const PROTECTED_ENV_VARS = [
  'OPENAI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'DATABASE_URL'
] as const;

// Required environment variables for production
const REQUIRED_PROD_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
] as const;

interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates environment configuration
 */
export const validateEnvironmentConfig = (): ConfigValidationResult => {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Check for hardcoded secrets in production
  if (IS_PRODUCTION) {
    for (const envVar of PROTECTED_ENV_VARS) {
      if (import.meta.env[envVar]) {
        result.errors.push(`Hardcoded secret detected: ${envVar}`);
        result.isValid = false;
      }
    }

    // Check required production variables
    for (const envVar of REQUIRED_PROD_ENV_VARS) {
      if (!import.meta.env[envVar]) {
        result.errors.push(`Missing required environment variable: ${envVar}`);
        result.isValid = false;
      }
    }
  }

  // Validate URL formats
  const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !isValidUrl(supabaseUrl)) {
    result.errors.push('Invalid Supabase URL format');
    result.isValid = false;
  }

  return result;
};

/**
 * Validates URL format
 */
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitizes configuration for logging
 */
export const sanitizeConfigForLogging = (config: Record<string, any>): Record<string, any> => {
  const sanitized = { ...config };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      // Mask API keys and secrets
      if (key.toLowerCase().includes('key') || 
          key.toLowerCase().includes('secret') || 
          key.toLowerCase().includes('token')) {
        sanitized[key] = sanitized[key].substring(0, 8) + '****';
      }
      
      // Mask URLs except domain
      if (key.toLowerCase().includes('url') && sanitized[key].startsWith('http')) {
        try {
          const url = new URL(sanitized[key]);
          sanitized[key] = `${url.protocol}//${url.hostname}/*****`;
        } catch {
          sanitized[key] = '*****';
        }
      }
    }
  }
  
  return sanitized;
};

/**
 * Validates runtime configuration on app start
 */
export const validateRuntimeConfig = (): void => {
  const validation = validateEnvironmentConfig();
  
  if (!validation.isValid) {
    logger.error('Configuration validation failed', undefined, {
      errors: validation.errors,
      warnings: validation.warnings
    });
    
    if (IS_PRODUCTION) {
      throw new Error('Invalid production configuration detected');
    }
  }
  
  if (validation.warnings.length > 0) {
    logger.warn('Configuration warnings detected', {
      warnings: validation.warnings
    });
  }
  
  logger.info('Configuration validation passed');
};