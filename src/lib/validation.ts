import { z } from 'zod';

// Basic validation functions
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

export const validateNumeric = (value: string, options: { min?: number; max?: number } = {}): boolean => {
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (options.min !== undefined && num < options.min) return false;
  if (options.max !== undefined && num > options.max) return false;
  return true;
};

export const validateUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
};

interface ValidationRule {
  required?: boolean;
  email?: boolean;
  numeric?: boolean;
  url?: boolean;
  min?: number;
  max?: number;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateFormData = (data: Record<string, unknown>, schema: ValidationSchema): ValidationResult => {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const fieldErrors: string[] = [];

    if (rules.required && !validateRequired(value)) {
      fieldErrors.push('This field is required');
    }

    if (value && typeof value === 'string') {
      if (rules.email && !validateEmail(value)) {
        fieldErrors.push('Must be a valid email address');
      }

      if (rules.numeric && !validateNumeric(value, { min: rules.min, max: rules.max })) {
        fieldErrors.push('Must be a valid number');
        if (rules.min !== undefined) {
          fieldErrors.push(`Must be at least ${rules.min}`);
        }
        if (rules.max !== undefined) {
          fieldErrors.push(`Must be at most ${rules.max}`);
        }
      }

      if (rules.url && !validateUrl(value)) {
        fieldErrors.push('Must be a valid URL');
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors.join(', ');
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const createFieldValidator = (rules: ValidationRule) => {
  return (value: unknown): boolean | string => {
    if (rules.required && !validateRequired(value)) {
      return 'This field is required';
    }

    if (value && typeof value === 'string') {
      if (rules.email && !validateEmail(value)) {
        return 'Must be a valid email address';
      }

      if (rules.numeric && !validateNumeric(value)) {
        return 'Must be a valid number';
      }

      if (rules.numeric && rules.min !== undefined && parseFloat(value) < rules.min) {
        return `Must be at least ${rules.min}`;
      }

      if (rules.numeric && rules.max !== undefined && parseFloat(value) > rules.max) {
        return `Must be at most ${rules.max}`;
      }

      if (rules.url && !validateUrl(value)) {
        return 'Must be a valid URL';
      }
    }

    return true;
  };
};

// Input sanitization utilities
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .slice(0, 1000); // Limit length
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
};

// URL whitelist for admin functions
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'franceagrimer.fr',
  'www.franceagrimer.fr',
  'madr.ro',
  'www.madr.ro',
  'mfe.gov.ro'
];

export const validateAdminUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

// Zod schemas for form validation
export const pipelineConfigSchema = z.object({
  maxPages: z.number().min(1).max(100),
  batchSize: z.number().min(1).max(50),
  timeout: z.number().min(1000).max(300000), // 1s to 5min
  retryAttempts: z.number().min(0).max(5),
  forceReprocess: z.boolean(),
  customPrompt: z.string().max(2000).optional().transform(val => 
    val ? sanitizeString(val) : undefined
  ),
  targetUrl: z.string().url().refine(validateAdminUrl, {
    message: 'URL not in allowed domains list'
  }).optional()
});

export const aiProcessingConfigSchema = z.object({
  model: z.enum(['gpt-4o', 'gpt-4', 'gpt-3.5-turbo']),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(100).max(8000),
  batchSize: z.number().min(1).max(20),
  customPrompt: z.string().max(5000).optional().transform(val => 
    val ? sanitizeString(val) : undefined
  ),
  enableRetry: z.boolean(),
  retryDelay: z.number().min(1000).max(60000) // 1s to 1min
});

export const debuggerConfigSchema = z.object({
  action: z.enum(['scrape', 'extract', 'process']),
  maxPages: z.number().min(1).max(10),
  forceReprocess: z.boolean(),
  targetUrl: z.string().url().refine(validateAdminUrl, {
    message: 'URL not in allowed domains list'
  }).optional()
});

// Prompt injection detection
const SUSPICIOUS_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /forget\s+everything/i,
  /you\s+are\s+now/i,
  /new\s+role/i,
  /system\s+prompt/i,
  /jailbreak/i,
  /<script/i,
  /javascript:/i,
  /data:/i,
  /vbscript:/i
];

export const detectPromptInjection = (input: string): boolean => {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(input));
};

export const sanitizePrompt = (prompt: string): string => {
  if (detectPromptInjection(prompt)) {
    throw new Error('Potential prompt injection detected');
  }
  return sanitizeString(prompt);
};

// Error handling for validation
export const handleValidationError = (error: z.ZodError): string => {
  const messages = error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
  return `Validation failed: ${messages.join(', ')}`;
};

// Type exports
export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;
export type AIProcessingConfig = z.infer<typeof aiProcessingConfigSchema>;
export type DebuggerConfig = z.infer<typeof debuggerConfigSchema>;