/**
 * Simple HTML sanitizer to prevent XSS attacks
 * Removes potentially dangerous HTML elements and attributes
 */

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  removeScripts?: boolean;
  removeEventHandlers?: boolean;
}

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

const DEFAULT_ALLOWED_ATTRIBUTES = [
  'href', 'target', 'rel', 'class', 'id', 'title',
  'src', 'alt', 'width', 'height'
];

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export const sanitizeHTML = (
  html: string, 
  options: SanitizeOptions = {}
): string => {
  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES,
    removeScripts = true,
    removeEventHandlers = true
  } = options;

  let sanitized = html;

  // Remove script tags and their content
  if (removeScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '');
  }

  // Remove javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove event handlers
  if (removeEventHandlers) {
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^"'\s>]+/gi, '');
  }

  // Remove dangerous tags (iframe, object, embed, etc.)
  const dangerousTags = ['iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link', 'style'];
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing versions
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });

  // Remove data: URLs which can contain scripts
  sanitized = sanitized.replace(/data:/gi, '');

  return sanitized;
};

/**
 * Create safe HTML for React components
 */
export const createSafeHTML = (html: string, options?: SanitizeOptions) => {
  return { __html: sanitizeHTML(html, options) };
};

/**
 * Basic text-only sanitizer that strips all HTML
 */
export const stripHTML = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};