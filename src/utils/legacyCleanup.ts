/**
 * Legacy code cleanup utilities
 * Replace deprecated patterns with modern alternatives
 */

import { logger } from '@/lib/logger';
import { prodLogger } from '@/utils/productionLogger';

/**
 * Centralized console.log replacement
 * Automatically routes to proper logging based on context
 */
export const safeLog = {
  debug: (message: string, ...args: any[]) => {
    prodLogger.debug(message, ...args);
  },
  
  info: (message: string, ...args: any[]) => {
    logger.info(message, { args });
  },
  
  warn: (message: string, ...args: any[]) => {
    logger.warn(message, { args });
  },
  
  error: (message: string, error?: Error, ...args: any[]) => {
    logger.error(message, error, { args });
  }
};

/**
 * Replace all console.log calls with structured logging
 * @deprecated Use logger or prodLogger directly
 */
export const replaceConsoleLog = (message: string, ...args: any[]) => {
  prodLogger.debug(`[LEGACY]: ${message}`, ...args);
};

/**
 * Rate limiting helper for API calls
 */
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private timeWindow: number // in milliseconds
  ) {}
  
  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );
    
    return this.requests.length < this.maxRequests;
  }
  
  recordRequest(): void {
    this.requests.push(Date.now());
  }
  
  async waitForAvailability(): Promise<void> {
    while (!this.canMakeRequest()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.recordRequest();
  }
}

/**
 * Sanitize HTML content to prevent XSS
 */
export const sanitizeHtml = (html: string): string => {
  // Basic sanitization - in production use DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/gi, '');
};

/**
 * Resilient selector matching with fallbacks
 */
export const resilientSelector = (
  element: Element,
  selectors: string[]
): Element | null => {
  for (const selector of selectors) {
    try {
      const found = element.querySelector(selector);
      if (found) return found;
    } catch (error) {
      logger.warn(`Selector failed: ${selector}`, { error });
    }
  }
  return null;
};

/**
 * Extract text with multiple strategies
 */
export const extractTextContent = (element: Element): string => {
  // Try different text extraction methods
  const strategies = [
    () => element.textContent?.trim() || '',
    () => element.innerHTML?.replace(/<[^>]*>/g, '').trim() || '',
    () => (element as HTMLElement).innerText?.trim() || ''
  ];
  
  for (const strategy of strategies) {
    try {
      const text = strategy();
      if (text.length > 0) return text;
    } catch (error) {
      logger.warn('Text extraction strategy failed', { error });
    }
  }
  
  return '';
};