/**
 * Security validation hook for document processing
 * Phase 4D: Security Hardening & Input Validation
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  validateFileUpload,
  validateExtractionRequest,
  validateClientProfile,
  documentProcessingLimiter,
  generalApiLimiter,
  type ValidationResult,
} from '@/utils/security';

interface SecurityValidationState {
  isValidating: boolean;
  violations: string[];
  rateLimited: boolean;
}

export const useSecurityValidation = (userId?: string) => {
  const [state, setState] = useState<SecurityValidationState>({
    isValidating: false,
    violations: [],
    rateLimited: false,
  });

  const validateFile = useCallback((file: File): ValidationResult => {
    setState(prev => ({ ...prev, isValidating: true }));
    
    const result = validateFileUpload(file);
    
    if (!result.isValid) {
      setState(prev => ({ 
        ...prev, 
        violations: result.errors,
        isValidating: false 
      }));
      
      result.errors.forEach(error => {
        toast.error(`Security Violation: ${error}`);
      });
    } else {
      setState(prev => ({ 
        ...prev, 
        violations: [],
        isValidating: false 
      }));
    }
    
    return result;
  }, []);

  const validateExtractionPayload = useCallback((payload: any): ValidationResult => {
    setState(prev => ({ ...prev, isValidating: true }));
    
    const result = validateExtractionRequest(payload);
    
    if (!result.isValid) {
      setState(prev => ({ 
        ...prev, 
        violations: result.errors,
        isValidating: false 
      }));
      
      result.errors.forEach(error => {
        toast.error(`Security Violation: ${error}`);
      });
    } else {
      setState(prev => ({ 
        ...prev, 
        violations: [],
        isValidating: false 
      }));
    }
    
    return result;
  }, []);

  const validateProfile = useCallback((profile: any): ValidationResult => {
    setState(prev => ({ ...prev, isValidating: true }));
    
    const result = validateClientProfile(profile);
    
    if (!result.isValid) {
      setState(prev => ({ 
        ...prev, 
        violations: result.errors,
        isValidating: false 
      }));
      
      result.errors.forEach(error => {
        toast.error(`Validation Error: ${error}`);
      });
    } else {
      setState(prev => ({ 
        ...prev, 
        violations: [],
        isValidating: false 
      }));
    }
    
    return result;
  }, []);

  const checkRateLimit = useCallback((operation: 'document_processing' | 'general_api'): boolean => {
    const identifier = userId || 'anonymous';
    const limiter = operation === 'document_processing' 
      ? documentProcessingLimiter 
      : generalApiLimiter;
    
    const allowed = limiter.isAllowed(identifier);
    
    if (!allowed) {
      setState(prev => ({ ...prev, rateLimited: true }));
      toast.error('Rate limit exceeded. Please wait before trying again.');
      
      // Reset rate limit status after 1 minute
      setTimeout(() => {
        setState(prev => ({ ...prev, rateLimited: false }));
      }, 60000);
    }
    
    return allowed;
  }, [userId]);

  const clearViolations = useCallback(() => {
    setState(prev => ({ ...prev, violations: [] }));
  }, []);

  return {
    ...state,
    validateFile,
    validateExtractionPayload,
    validateProfile,
    checkRateLimit,
    clearViolations,
  };
};