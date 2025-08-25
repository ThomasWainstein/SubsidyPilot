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
  const allowedTags = options.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span', 'div', 'code', 'pre'];
  const allowedAttributes = options.allowedAttributes || { 'a': ['href', 'target', 'rel', 'title'], '*': ['class'] };
  const forbiddenTags = options.forbiddenTags || ['script', 'iframe', 'object', 'embed', 'style', 'form', 'input', 'button', 'meta', 'link'];
  const forbiddenAttributes = options.forbiddenAttributes || ['on*', 'javascript:', 'vbscript:', 'data:'];

  let sanitized = htmlContent;

  // Remove forbidden tags completely (including content)
  forbiddenTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^>]*>.*?<\\/${tag}>`, 'gis');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing versions
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*/>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });

  // Remove dangerous protocols and javascript
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove all event handlers
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .replace(/url\s*\(\s*javascript:/gi, ''); // Remove javascript: in CSS

  // Clean up remaining HTML, keeping only allowed tags and attributes
  sanitized = sanitized.replace(/<(\/?[\w\s="':\-;.]+)>/g, (match, tagContent) => {
    const parts = tagContent.trim().split(/\s+/);
    const isClosing = tagContent.startsWith('/');
    const tagName = (isClosing ? parts[0].substring(1) : parts[0]).toLowerCase();
    
    if (allowedTags.includes(tagName)) {
      if (isClosing) {
        return `</${tagName}>`;
      }
      
      // Filter and validate attributes
      const tagAllowedAttrs = allowedAttributes[tagName] || allowedAttributes['*'] || [];
      const validAttributes = parts.slice(1).map(attr => {
        if (!attr.includes('=')) return '';
        
        const [attrName, ...attrValueParts] = attr.split('=');
        const attrValue = attrValueParts.join('=').replace(/^["']|["']$/g, '');
        
        if (tagAllowedAttrs.includes(attrName.toLowerCase())) {
          // Additional validation for href attributes
          if (attrName.toLowerCase() === 'href') {
            if (/^https?:\/\/|^\/|^#|^mailto:|^tel:/.test(attrValue)) {
              return `${attrName}="${attrValue}"`;
            }
            return '';
          }
          return `${attrName}="${attrValue}"`;
        }
        return '';
      }).filter(Boolean);
      
      return `<${tagName}${validAttributes.length ? ' ' + validAttributes.join(' ') : ''}>`;
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