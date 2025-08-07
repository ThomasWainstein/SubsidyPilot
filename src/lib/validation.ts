import { z } from 'zod';

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