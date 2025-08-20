/**
 * HTML processing utilities for clean text display
 */

/**
 * Comprehensive HTML entity decoder
 */
const htmlEntities: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<', 
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&euro;': '€',
  '&pound;': '£',
  '&yen;': '¥',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&laquo;': '«',
  '&raquo;': '»',
  '&deg;': '°',
  '&plusmn;': '±',
  '&times;': '×',
  '&divide;': '÷',
};

/**
 * Decode HTML entities including numeric entities
 */
export const decodeHtmlEntities = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  let decoded = text;
  
  // Handle named entities
  Object.entries(htmlEntities).forEach(([entity, replacement]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), replacement);
  });
  
  // Handle numeric entities like &#8364; (€) and &#x20AC; (€)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  return decoded;
};

/**
 * Clean HTML content by removing tags and decoding entities
 */
export const cleanHtmlContent = (content: string): string => {
  if (!content || typeof content !== 'string') return '';
  
  return decodeHtmlEntities(content)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Convert HTML to plain text while preserving paragraph breaks
 */
export const htmlToText = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  
  return decodeHtmlEntities(html)
    .replace(/<\/?(h[1-6]|p|div|br)\s*\/?>/gi, '\n') // Convert block elements to line breaks
    .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
    .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
    .trim();
};

/**
 * Extract clean text content from HTML, preserving structure
 */
export const extractTextContent = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  
  // Handle common HTML structures while preserving readability
  let text = html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n') // Headings with spacing
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n') // Paragraphs with spacing
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n') // List items with bullets
    .replace(/<br\s*\/?>/gi, '\n') // Line breaks
    .replace(/<[^>]*>/g, '') // Remove remaining tags
    .replace(/&[a-zA-Z0-9#]+;/g, (entity) => decodeHtmlEntities(entity)) // Decode entities
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize spacing
    .trim();
  
  return text;
};

/**
 * Check if content contains HTML tags
 */
export const containsHtml = (content: string): boolean => {
  if (!content || typeof content !== 'string') return false;
  return /<[^>]+>/.test(content);
};