/**
 * Content Processor - Cleans and normalizes HTML content
 */

import { HarvestConfig } from '../types/scraper.types';

export class ContentProcessor {
  private config: HarvestConfig;

  constructor(config: HarvestConfig) {
    this.config = config;
  }

  /**
   * Clean HTML content while preserving structure
   */
  async cleanHtml(html: string): Promise<string> {
    // Remove script and style elements
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove common navigation elements
    cleaned = cleaned.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
    cleaned = cleaned.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '');
    cleaned = cleaned.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
    
    // Remove ads and tracking elements
    cleaned = cleaned.replace(/<div[^>]*(?:class|id)="[^"]*(?:ad|advertisement|tracking|analytics)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/>\s+</g, '><');
    
    return cleaned.trim();
  }

  /**
   * Extract visible text from HTML element
   */
  extractTextContent(element: Element): string {
    if (!element) return '';
    
    // Clone to avoid modifying original
    const clone = element.cloneNode(true) as Element;
    
    // Remove script and style elements
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());
    
    // Get text content and normalize whitespace
    const text = clone.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Convert HTML to clean markdown
   */
  htmlToMarkdown(html: string): string {
    let markdown = html;
    
    // Headers
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
    
    // Paragraphs
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
    
    // Lists
    markdown = markdown.replace(/<ul[^>]*>/gi, '');
    markdown = markdown.replace(/<\/ul>/gi, '\n');
    markdown = markdown.replace(/<ol[^>]*>/gi, '');
    markdown = markdown.replace(/<\/ol>/gi, '\n');
    markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
    
    // Links
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // Bold and italic
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    // Clean up whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.replace(/[ \t]+/g, ' ');
    
    return markdown.trim();
  }

  /**
   * Check if element contains meaningful content
   */
  hasMeaningfulContent(element: Element): boolean {
    const text = this.extractTextContent(element);
    
    // Must have some text
    if (!text || text.length < 3) {
      return false;
    }
    
    // Skip if mostly whitespace or special characters
    const alphanumeric = text.replace(/[^a-zA-Z0-9]/g, '');
    if (alphanumeric.length < text.length * 0.3) {
      return false;
    }
    
    // Skip if looks like navigation or UI text
    const navigationKeywords = ['menu', 'navigation', 'breadcrumb', 'skip to', 'go to', 'home', 'login', 'search'];
    const lowerText = text.toLowerCase();
    if (navigationKeywords.some(keyword => lowerText.includes(keyword) && text.length < 50)) {
      return false;
    }
    
    return true;
  }

  /**
   * Normalize URL for consistent hashing
   */
  normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove fragment and query parameters that don't affect content
      urlObj.hash = '';
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      
      // Sort remaining parameters for consistency
      urlObj.searchParams.sort();
      
      // Normalize path
      let path = urlObj.pathname;
      if (path.endsWith('/') && path.length > 1) {
        path = path.slice(0, -1);
      }
      urlObj.pathname = path;
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }
}