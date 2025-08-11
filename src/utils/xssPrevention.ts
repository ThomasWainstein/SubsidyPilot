/**
 * XSS Prevention Utilities
 * Enhanced security for HTML content rendering
 */

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: { [key: string]: string[] };
  forbiddenTags?: string[];
  forbiddenAttributes?: string[];
}

/**
 * Sanitize HTML content for safe rendering
 */
export function sanitizeHTML(htmlContent: string, options: SanitizeOptions = {}): string {
  const allowedTags = options.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const forbiddenTags = options.forbiddenTags || ['script', 'iframe', 'object', 'embed', 'style'];

  let sanitized = htmlContent;

  // Remove forbidden tags completely
  forbiddenTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove all HTML attributes except allowed ones
  sanitized = sanitized.replace(/<(\w+)\s+[^>]*>/g, (match, tagName) => {
    if (allowedTags.includes(tagName.toLowerCase())) {
      return `<${tagName}>`;
    }
    return '';
  });

  return sanitized;
}

/**
 * Create safe HTML for dangerouslySetInnerHTML
 */
export function createSafeHTML(htmlString: string): { __html: string } {
  return { __html: sanitizeHTML(htmlString) };
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
  // Remove dangerous protocols
  const sanitized = url
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/data:application\/javascript/gi, '');

  // Only allow http, https, mailto, tel protocols
  const allowedProtocols = /^(https?:|mailto:|tel:)/i;
  
  if (!allowedProtocols.test(sanitized) && !sanitized.startsWith('/')) {
    return '#'; // Default to hash if URL is suspicious
  }

  return sanitized;
}

/**
 * Sanitize text input for display
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/eval\s*\(/gi, '') // Remove eval calls
    .trim();
}

/**
 * Content Security Policy configuration
 */
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'font-src': ["'self'", "https://fonts.gstatic.com"],
  'img-src': ["'self'", "data:", "https:", "blob:"],
  'connect-src': ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

/**
 * Apply CSP headers (for server-side rendering)
 */
export function getCSPString(): string {
  return Object.entries(CSP_CONFIG)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}