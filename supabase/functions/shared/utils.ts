// Shared utilities for AgriTool Edge Functions
// Critical fixes based on comprehensive analysis

// Environment configuration standardization
export interface EdgeFunctionConfig {
  supabase_url: string;
  supabase_service_key: string;
  openai_primary_key?: string;
  openai_backup_key?: string;
}

export function getStandardizedConfig(): EdgeFunctionConfig {
  const config = {
    supabase_url: Deno.env.get('SUPABASE_URL'),
    supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    openai_primary_key: Deno.env.get('SCRAPPER_RAW_GPT_API'), // Existing secret with typo
    openai_backup_key: Deno.env.get('OPENAI_API_KEY')
  };

  if (!config.supabase_url || !config.supabase_service_key) {
    const missing = [];
    if (!config.supabase_url) missing.push('SUPABASE_URL');
    if (!config.supabase_service_key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(`Missing required Supabase configuration: ${missing.join(', ')}`);
  }

  return config as EdgeFunctionConfig;
}

// API Rate Limiter with adaptive throttling
export class APIRateLimiter {
  private lastCall = 0;
  private minInterval: number;
  private requests: number[] = [];
  
  constructor(requestsPerMinute: number = 50) {
    this.minInterval = 60000 / requestsPerMinute;
  }
  
  async throttle(): Promise<void> {
    const now = Date.now();
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => now - time < 60000);
    
    // Check if we're over the rate limit
    if (this.requests.length >= 50) {
      const waitTime = 60000 - (now - this.requests[0]);
      if (waitTime > 0) {
        console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Ensure minimum interval between requests
    const elapsed = now - this.lastCall;
    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCall = Date.now();
    this.requests.push(this.lastCall);
  }
}

// Retry handler with exponential backoff
export class RetryHandler {
  static async withRetry<T>(
    fn: () => Promise<T>, 
    maxRetries = 3,
    baseDelay = 1000,
    backoffMultiplier = 2
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          console.error(`❌ Max retries (${maxRetries}) exceeded:`, error);
          throw error;
        }
        
        const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
        console.warn(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}

// Circuit breaker pattern for external API calls
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold = 5,
    private timeout = 60000,
    private name = 'CircuitBreaker'
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log(`🔄 ${this.name}: Circuit breaker switching to HALF_OPEN`);
      } else {
        throw new Error(`${this.name}: Circuit breaker is OPEN`);
      }
    }
    
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private reset() {
    if (this.failures > 0) {
      console.log(`✅ ${this.name}: Circuit breaker reset to CLOSED`);
    }
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold && this.state !== 'OPEN') {
      this.state = 'OPEN';
      console.error(`🚨 ${this.name}: Circuit breaker OPEN after ${this.failures} failures`);
    }
  }
  
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime
    };
  }
}

// Performance monitoring utility
export class PerformanceMonitor {
  static async trackOperation<T>(
    operationName: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = Deno.memoryUsage();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      const endMemory = Deno.memoryUsage();
      const memoryDelta = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
      
      console.log(`✅ ${operationName} completed:`, {
        duration: `${duration}ms`,
        memory_delta: `${memoryDelta.toFixed(2)}MB`,
        status: 'success',
        ...metadata
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ ${operationName} failed:`, {
        duration: `${duration}ms`,
        error: error.message,
        status: 'failed',
        ...metadata
      });
      throw error;
    }
  }
}

// Input validation schemas using Zod
export interface HarvesterRequest {
  action: 'scrape' | 'status' | 'stop';
  max_pages?: number;
  target_urls?: string[];
  dry_run?: boolean;
}

export interface AIProcessorRequest {
  source?: 'franceagrimer' | 'afir' | 'all';
  session_id?: string;
  page_ids?: string[];
  quality_threshold?: number;
}

export interface PipelineRequest {
  action: 'start_full_pipeline' | 'trigger_harvesting' | 'trigger_processing' | 'monitor_pipeline' | 'health_check';
  execution_config?: {
    countries?: string[];
    max_pages_per_country?: number;
    enable_ai_processing?: boolean;
    enable_form_generation?: boolean;
    quality_threshold?: number;
  };
  pipeline_id?: string;
}

export function validateHarvesterRequest(body: any): HarvesterRequest {
  const { action = 'scrape', max_pages = 10, target_urls, dry_run = false } = body;
  
  if (!['scrape', 'status', 'stop'].includes(action)) {
    throw new Error('Invalid action. Must be: scrape, status, or stop');
  }
  
  if (typeof max_pages !== 'number' || max_pages < 1 || max_pages > 100) {
    throw new Error('max_pages must be a number between 1 and 100');
  }
  
  if (target_urls && (!Array.isArray(target_urls) || !target_urls.every(url => typeof url === 'string'))) {
    throw new Error('target_urls must be an array of strings');
  }
  
  return { action, max_pages, target_urls, dry_run };
}

export function validateAIProcessorRequest(body: any): AIProcessorRequest {
  const { source = 'all', session_id, page_ids, quality_threshold = 0.7 } = body;
  
  if (!['franceagrimer', 'afir', 'all'].includes(source)) {
    throw new Error('Invalid source. Must be: franceagrimer, afir, or all');
  }
  
  if (quality_threshold < 0 || quality_threshold > 1) {
    throw new Error('quality_threshold must be between 0 and 1');
  }
  
  if (page_ids && !Array.isArray(page_ids)) {
    throw new Error('page_ids must be an array');
  }
  
  return { source, session_id, page_ids, quality_threshold };
}

export function validatePipelineRequest(body: any): PipelineRequest {
  const validActions = ['start_full_pipeline', 'trigger_harvesting', 'trigger_processing', 'monitor_pipeline', 'health_check'];
  const { action, execution_config = {}, pipeline_id } = body;
  
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action. Must be one of: ${validActions.join(', ')}`);
  }
  
  // Validate execution_config if provided
  if (execution_config) {
    const { countries, max_pages_per_country, quality_threshold } = execution_config;
    
    if (countries && (!Array.isArray(countries) || !countries.every(c => typeof c === 'string'))) {
      throw new Error('countries must be an array of strings');
    }
    
    if (max_pages_per_country && (typeof max_pages_per_country !== 'number' || max_pages_per_country < 1)) {
      throw new Error('max_pages_per_country must be a positive number');
    }
    
    if (quality_threshold && (quality_threshold < 0 || quality_threshold > 1)) {
      throw new Error('quality_threshold must be between 0 and 1');
    }
  }
  
  return { action, execution_config, pipeline_id };
}

// Enhanced content processing utilities
export class ContentProcessor {
  static extractCleanText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  static convertToMarkdown(html: string): string {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  
  static extractUrls(html: string, patterns: RegExp[], baseUrl: string): string[] {
    const urls = new Set<string>();
    
    for (const pattern of patterns) {
      const matches = html.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        const url = match[1];
        if (this.isValidUrl(url)) {
          const fullUrl = url.startsWith('http') ? 
            url : new URL(url, baseUrl).toString();
          urls.add(fullUrl);
        }
      }
    }
    
    return Array.from(urls);
  }
  
  private static isValidUrl(url: string): boolean {
    return url && 
           !url.startsWith('#') && 
           !url.startsWith('javascript:') && 
           !url.includes('mailto:') &&
           url.length > 3;
  }
  
  static optimizeContentForAI(content: string, maxLength = 8000): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Extract most relevant sections
    const sections = content.split(/\n\n+/);
    const prioritized = sections
      .filter(section => section.length > 50) // Remove short sections
      .sort((a, b) => {
        // Prioritize sections with key terms
        const keyTerms = ['aide', 'subvention', 'financement', 'măsura', 'finanțare', 'eligible', 'amount', 'deadline'];
        const aScore = keyTerms.reduce((score, term) => score + (a.toLowerCase().includes(term) ? 1 : 0), 0);
        const bScore = keyTerms.reduce((score, term) => score + (b.toLowerCase().includes(term) ? 1 : 0), 0);
        return bScore - aScore;
      });
    
    let result = '';
    for (const section of prioritized) {
      if (result.length + section.length + 2 <= maxLength) {
        result += section + '\n\n';
      } else {
        break;
      }
    }
    
    return result.trim();
  }
}

// Enhanced OpenAI client with rate limiting and fallback
export class OpenAIClient {
  private rateLimiter = new APIRateLimiter(45); // Conservative rate limit
  private circuitBreaker = new CircuitBreaker(3, 60000, 'OpenAI');
  
  constructor(
    private primaryKey?: string,
    private backupKey?: string
  ) {
    if (!primaryKey && !backupKey) {
      throw new Error('At least one OpenAI API key must be provided');
    }
  }
  
  async extractContent(
    content: string, 
    systemPrompt: string, 
    options: { 
      temperature?: number; 
      maxTokens?: number; 
      model?: string;
    } = {}
  ): Promise<any> {
    await this.rateLimiter.throttle();
    
    return this.circuitBreaker.execute(async () => {
      return RetryHandler.withRetry(async () => {
        const optimizedContent = ContentProcessor.optimizeContentForAI(content);
        const response = await this.makeRequest(optimizedContent, systemPrompt, options);
        return this.parseResponse(response);
      }, 3, 1000);
    });
  }
  
  private async makeRequest(content: string, systemPrompt: string, options: any) {
    const keys = [this.primaryKey, this.backupKey].filter(Boolean);
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        console.log(`🤖 Making OpenAI request with key ${i + 1}/${keys.length}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: options.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: content }
            ],
            temperature: options.temperature || 0.1,
            max_tokens: options.maxTokens || 2000
          })
        });
        
        if (response.ok) {
          return await response.json();
        } else if (response.status === 429) {
          console.warn(`⚠️ Rate limited on key ${i + 1}, trying next...`);
          if (i < keys.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        } else {
          const errorText = await response.text();
          throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
        }
      } catch (error) {
        if (i === keys.length - 1) {
          throw error; // Last key failed
        }
        console.warn(`⚠️ OpenAI key ${i + 1} failed, trying backup:`, error.message);
      }
    }
    
    throw new Error('All OpenAI keys failed');
  }
  
  private parseResponse(response: any): any {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    try {
      // Try different JSON extraction patterns
      const patterns = [
        /```json\n([\s\S]*?)\n```/,
        /```\n([\s\S]*?)\n```/,
        /\{[\s\S]*\}/
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const jsonStr = match[1] || match[0];
          return JSON.parse(jsonStr);
        }
      }
      
      // If no patterns match, try parsing the entire content
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ Failed to parse OpenAI response:', content.substring(0, 200));
      throw new Error(`Invalid JSON response from OpenAI: ${error.message}`);
    }
  }
}

// Batch processing utility
export class BatchProcessor {
  static async processInBatches<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize = 3,
    delayBetweenBatches = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
      
      const batchResults = await Promise.allSettled(
        batch.map(item => processor(item))
      );
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.warn('⚠️ Batch item failed:', result.reason);
        }
      }
      
      // Rate limiting between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    return results;
  }
}