/**
 * Security utilities for input validation and sanitization
 * Phase 4D: Security Hardening & Input Validation
 */

// File validation constants
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp'
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_FILES_PER_UPLOAD = 10;

// URL validation patterns
const ALLOWED_URL_PATTERNS = [
  /^https:\/\/[^\/]+\.supabase\.co\//,
  /^https:\/\/storage\.googleapis\.com\//,
  /^https:\/\/[^\/]+\.amazonaws\.com\//,
] as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * Validates file upload security
 */
export function validateFileUpload(file: File): ValidationResult {
  const errors: string[] = [];

  // Size validation
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  // Type validation
  if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
    errors.push(`File type ${file.type} not allowed`);
  }

  // Name validation (prevent path traversal)
  if (file.name.includes('../') || file.name.includes('..\\')) {
    errors.push('Invalid file name: path traversal detected');
  }

  // Extension validation
  const extension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['pdf', 'docx', 'xlsx', 'txt', 'csv', 'jpg', 'jpeg', 'png', 'webp'];
  if (!extension || !validExtensions.includes(extension)) {
    errors.push('Invalid file extension');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates and sanitizes file URLs (SSRF protection)
 */
export function validateFileUrl(url: string): ValidationResult {
  const errors: string[] = [];

  try {
    const urlObj = new URL(url);
    
    // Must be HTTPS
    if (urlObj.protocol !== 'https:') {
      errors.push('URL must use HTTPS protocol');
    }

    // Check against allowed patterns
    const isAllowed = ALLOWED_URL_PATTERNS.some(pattern => pattern.test(url));
    if (!isAllowed) {
      errors.push('URL domain not allowed');
    }

    // Prevent private IP ranges (SSRF protection)
    const hostname = urlObj.hostname;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      errors.push('Private IP addresses not allowed');
    }

  } catch (error) {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: url,
  };
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[char] || char;
    })
    .trim()
    .slice(0, 10000); // Limit length
}

/**
 * Validates extraction request payload
 */
export function validateExtractionRequest(payload: any): ValidationResult {
  const errors: string[] = [];

  if (!payload.documentId || typeof payload.documentId !== 'string') {
    errors.push('Valid document ID required');
  }

  if (!payload.fileUrl || typeof payload.fileUrl !== 'string') {
    errors.push('Valid file URL required');
  } else {
    const urlValidation = validateFileUrl(payload.fileUrl);
    if (!urlValidation.isValid) {
      errors.push(...urlValidation.errors);
    }
  }

  if (payload.fileName && typeof payload.fileName === 'string') {
    if (payload.fileName.length > 255) {
      errors.push('File name too long');
    }
    if (payload.fileName.includes('../') || payload.fileName.includes('..\\')) {
      errors.push('Invalid characters in file name');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      documentId: payload.documentId,
      fileUrl: payload.fileUrl,
      fileName: payload.fileName ? sanitizeInput(payload.fileName) : undefined,
      documentType: payload.documentType ? sanitizeInput(payload.documentType) : undefined,
    },
  };
}

/**
 * Rate limiting utility
 */
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

export const documentProcessingLimiter = new RateLimiter(60000, 20); // 20 requests per minute
export const generalApiLimiter = new RateLimiter(60000, 100); // 100 requests per minute

/**
 * Validates client profile data
 */
export function validateClientProfile(profile: any): ValidationResult {
  const errors: string[] = [];

  if (!profile.applicant_type_id || typeof profile.applicant_type_id !== 'string') {
    errors.push('Valid applicant type required');
  }

  if (profile.business_name && typeof profile.business_name === 'string') {
    if (profile.business_name.length > 200) {
      errors.push('Business name too long');
    }
  }

  if (profile.contact_email && typeof profile.contact_email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.contact_email)) {
      errors.push('Invalid email format');
    }
  }

  if (profile.tax_id && typeof profile.tax_id === 'string') {
    // Remove any non-alphanumeric characters for validation
    const cleanTaxId = profile.tax_id.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanTaxId.length < 5 || cleanTaxId.length > 20) {
      errors.push('Invalid tax ID format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      ...profile,
      business_name: profile.business_name ? sanitizeInput(profile.business_name) : undefined,
      contact_email: profile.contact_email ? sanitizeInput(profile.contact_email) : undefined,
      contact_phone: profile.contact_phone ? sanitizeInput(profile.contact_phone) : undefined,
      address: profile.address ? sanitizeInput(profile.address) : undefined,
      tax_id: profile.tax_id ? sanitizeInput(profile.tax_id) : undefined,
    },
  };
}

/**
 * Sanitizes log data to prevent sensitive information leakage
 */
export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = ['password', 'token', 'key', 'secret', 'api_key', 'authorization'];
  const sanitized = { ...data };

  for (const [key, value] of Object.entries(sanitized)) {
    const keyLower = key.toLowerCase();
    
    // Remove sensitive fields
    if (sensitiveFields.some(field => keyLower.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeLogData(value);
    }
  }

  return sanitized;
}