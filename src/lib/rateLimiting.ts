import { logger } from './logger';
import { monitoring } from './monitoring';
import { PRODUCTION_CONFIG } from '@/config/production';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RequestBatch {
  id: string;
  requests: (() => Promise<any>)[];
  priority: number;
  timestamp: number;
  maxConcurrency: number;
}

class APIRateLimiter {
  private static instance: APIRateLimiter;
  private rateLimits = new Map<string, { count: number; resetTime: number }>();
  private requestQueue: RequestBatch[] = [];
  private activeRequests = 0;
  private maxConcurrentRequests = PRODUCTION_CONFIG.api.rateLimitPerMinute / 10; // 10% of rate limit

  static getInstance(): APIRateLimiter {
    if (!APIRateLimiter.instance) {
      APIRateLimiter.instance = new APIRateLimiter();
    }
    return APIRateLimiter.instance;
  }

  constructor() {
    this.startCleanupTimer();
    this.startBatchProcessor();
  }

  // Rate limiting
  checkRateLimit(identifier: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    
    let limitData = this.rateLimits.get(key);
    
    // Reset window if expired
    if (!limitData || now >= limitData.resetTime) {
      limitData = {
        count: 0,
        resetTime: now + config.windowMs
      };
      this.rateLimits.set(key, limitData);
    }

    const allowed = limitData.count < config.maxRequests;
    
    if (allowed) {
      limitData.count++;
    } else {
      // Report rate limit exceeded
      monitoring.captureError({
        message: `Rate limit exceeded for ${identifier}`,
        level: 'warning',
        context: {
          identifier,
          limit: config.maxRequests,
          windowMs: config.windowMs,
          currentCount: limitData.count
        }
      });
    }

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - limitData.count),
      resetTime: limitData.resetTime
    };
  }

  // Request batching and queuing
  async batchRequest<T>(
    requests: (() => Promise<T>)[],
    options: {
      priority?: number;
      maxConcurrency?: number;
      batchSize?: number;
      delayBetweenBatches?: number;
    } = {}
  ): Promise<T[]> {
    const {
      priority = 5,
      maxConcurrency = 5,
      batchSize = 10,
      delayBetweenBatches = 100
    } = options;

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Batching ${requests.length} requests`, {
      batchId,
      priority,
      maxConcurrency,
      batchSize
    });

    const results: T[] = [];
    const chunks = this.chunkArray(requests, batchSize);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Wait for available slots
      while (this.activeRequests >= this.maxConcurrentRequests) {
        await this.delay(50);
      }

      try {
        this.activeRequests += chunk.length;
        
        // Execute chunk with limited concurrency
        const chunkResults = await this.executeWithConcurrencyLimit(chunk, maxConcurrency);
        results.push(...chunkResults);

        // Delay between batches to prevent overwhelming
        if (i < chunks.length - 1 && delayBetweenBatches > 0) {
          await this.delay(delayBetweenBatches);
        }
      } finally {
        this.activeRequests -= chunk.length;
      }
    }

    monitoring.captureMetric({
      name: 'batch_request_completed',
      value: requests.length,
      timestamp: Date.now(),
      context: {
        batchId,
        totalRequests: requests.length,
        batchCount: chunks.length
      }
    });

    logger.success(`Batch request completed`, {
      batchId,
      totalRequests: requests.length,
      successfulResults: results.length
    });

    return results;
  }

  private async executeWithConcurrencyLimit<T>(
    requests: (() => Promise<T>)[],
    maxConcurrency: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const request of requests) {
      const promise = this.executeRequest(request).then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  private async executeRequest<T>(request: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await request();
      
      monitoring.captureMetric({
        name: 'api_request_duration',
        value: Date.now() - startTime,
        timestamp: Date.now(),
        context: { status: 'success' }
      });

      return result;
    } catch (error) {
      monitoring.captureMetric({
        name: 'api_request_duration',
        value: Date.now() - startTime,
        timestamp: Date.now(),
        context: { status: 'error' }
      });

      monitoring.captureError({
        message: `API request failed: ${(error as Error).message}`,
        level: 'error',
        context: { error: error as Error }
      });

      throw error;
    }
  }

  // Request deduplication
  private requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();

  async deduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 5000 // 5 seconds default
  ): Promise<T> {
    const cached = this.requestCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      monitoring.captureMetric({
        name: 'request_deduplication_hit',
        value: 1,
        timestamp: Date.now(),
        context: { key }
      });
      
      return cached.promise as Promise<T>;
    }

    const promise = requestFn();
    this.requestCache.set(key, {
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      return result;
    } catch (error) {
      // Remove failed request from cache
      this.requestCache.delete(key);
      throw error;
    }
  }

  // Circuit breaker pattern
  private circuitBreakers = new Map<string, {
    failures: number;
    lastFailureTime: number;
    state: 'closed' | 'open' | 'half-open';
  }>();

  async circuitBreakerRequest<T>(
    circuitName: string,
    requestFn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeout?: number;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const {
      failureThreshold = 5,
      resetTimeout = 60000, // 1 minute
      timeout = 30000 // 30 seconds
    } = options;

    let breaker = this.circuitBreakers.get(circuitName);
    if (!breaker) {
      breaker = { failures: 0, lastFailureTime: 0, state: 'closed' };
      this.circuitBreakers.set(circuitName, breaker);
    }

    const now = Date.now();

    // Check if circuit should be reset
    if (breaker.state === 'open' && now - breaker.lastFailureTime > resetTimeout) {
      breaker.state = 'half-open';
      breaker.failures = 0;
    }

    // Reject if circuit is open
    if (breaker.state === 'open') {
      const error = new Error(`Circuit breaker is OPEN for ${circuitName}`);
      monitoring.captureError({
        message: error.message,
        level: 'warning',
        context: { circuitName, state: breaker.state }
      });
      throw error;
    }

    try {
      // Add timeout to request
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      const result = await Promise.race([requestFn(), timeoutPromise]);

      // Success - reset circuit if it was half-open
      if (breaker.state === 'half-open') {
        breaker.state = 'closed';
        breaker.failures = 0;
      }

      return result;
    } catch (error) {
      breaker.failures++;
      breaker.lastFailureTime = now;

      if (breaker.failures >= failureThreshold) {
        breaker.state = 'open';
        logger.warn(`Circuit breaker OPENED for ${circuitName}`, {
          failures: breaker.failures,
          threshold: failureThreshold
        });
      }

      throw error;
    }
  }

  // Request retry with exponential backoff
  async retryRequest<T>(
    requestFn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
      retryCondition?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      retryCondition = () => true
    } = options;

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        logger.warn(`Request failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries,
          error: (error as Error).message
        });

        await this.delay(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }

    throw lastError;
  }

  // Cleanup and management
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredLimits();
      this.cleanupRequestCache();
    }, 60000); // Cleanup every minute
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      this.processBatchQueue();
    }, 100); // Process every 100ms
  }

  private cleanupExpiredLimits(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, limit] of this.rateLimits.entries()) {
      if (now >= limit.resetTime) {
        this.rateLimits.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired rate limits', { cleanedCount });
    }
  }

  private cleanupRequestCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.requestCache.entries()) {
      if (now - cached.timestamp > 30000) { // Remove after 30 seconds
        this.requestCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up request cache', { cleanedCount });
    }
  }

  private processBatchQueue(): void {
    // Sort by priority and timestamp
    this.requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    // Process high priority batches first
    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const batch = this.requestQueue.shift()!;
      this.executeBatch(batch);
    }
  }

  private async executeBatch(batch: RequestBatch): Promise<void> {
    try {
      await this.batchRequest(batch.requests, {
        maxConcurrency: batch.maxConcurrency
      });
    } catch (error) {
      logger.error(`Batch execution failed for ${batch.id}`, error as Error);
    }
  }

  // Utility methods
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Statistics and monitoring
  getStats(): {
    activeRequests: number;
    rateLimitEntries: number;
    queuedBatches: number;
    cacheSize: number;
    circuitBreakers: Record<string, any>;
  } {
    const circuitBreakers: Record<string, any> = {};
    for (const [name, breaker] of this.circuitBreakers.entries()) {
      circuitBreakers[name] = { ...breaker };
    }

    return {
      activeRequests: this.activeRequests,
      rateLimitEntries: this.rateLimits.size,
      queuedBatches: this.requestQueue.length,
      cacheSize: this.requestCache.size,
      circuitBreakers
    };
  }
}

export const rateLimiter = APIRateLimiter.getInstance();