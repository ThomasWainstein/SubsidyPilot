// Circuit breaker pattern for resilient API calls
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Time in ms before attempting reset
  monitoringWindow: number; // Time window for failure counting
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private successCount: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.config.resetTimeout) {
        throw new Error(`Circuit breaker is OPEN. Next retry in ${
          Math.ceil((this.config.resetTimeout - (Date.now() - this.lastFailureTime)) / 1000)
        }s`);
      }
      // Try to reset to half-open
      this.state = 'half-open';
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    
    if (this.state === 'half-open') {
      this.successCount++;
      // After 3 successful calls, close the circuit
      if (this.successCount >= 3) {
        this.state = 'closed';
        console.log('🟢 Circuit breaker CLOSED - service recovered');
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      console.log(`🔴 Circuit breaker OPEN - ${this.failures} failures in ${
        this.config.monitoringWindow / 1000
      }s window`);
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextRetryIn: this.state === 'open' 
        ? Math.max(0, this.config.resetTimeout - (Date.now() - this.lastFailureTime))
        : 0
    };
  }
}

export class ResilientApiClient {
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;

  constructor(
    circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringWindow: 300000 // 5 minutes
    },
    retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 120000, // 2 minutes max
      backoffMultiplier: 2
    }
  ) {
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
    this.retryConfig = retryConfig;
  }

  async callWithResilience<T>(
    operation: () => Promise<Response>,
    context: {
      operationName: string;
      correlationId: string;
      tenantId?: string;
    }
  ): Promise<T> {
    return await this.circuitBreaker.execute(async () => {
      return await this.executeWithRetry(operation, context);
    });
  }

  private async executeWithRetry<T>(
    operation: () => Promise<Response>,
    context: {
      operationName: string;
      correlationId: string;
      tenantId?: string;
    }
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        console.log(`🔄 ${context.operationName} attempt ${attempt}/${this.retryConfig.maxAttempts} [${context.correlationId}]`);
        
        const response = await operation();

        // Check for rate limiting
        if (response.status === 429) {
          const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
          const delay = retryAfter || this.calculateBackoffDelay(attempt);
          
          if (attempt < this.retryConfig.maxAttempts) {
            console.log(`⏱️ Rate limited. Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
            continue;
          }
        }

        // Check for server errors (5xx)
        if (response.status >= 500) {
          if (attempt < this.retryConfig.maxAttempts) {
            const delay = this.calculateBackoffDelay(attempt);
            console.log(`�🔄 Server error ${response.status}. Retrying in ${delay}ms...`);
            await this.sleep(delay);
            continue;
          }
        }

        // Return Response object as-is - let caller parse body once
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response as unknown as T;

      } catch (error) {
        lastError = error as Error;
        console.log(`❌ ${context.operationName} attempt ${attempt} failed:`, error.message);

        // Don't retry for certain types of errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        if (attempt < this.retryConfig.maxAttempts) {
          const delay = this.calculateBackoffDelay(attempt);
          console.log(`⏱️ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Operation failed after ${this.retryConfig.maxAttempts} attempts. Last error: ${lastError?.message}`);
  }

  private parseRetryAfter(retryAfterHeader: string | null): number | null {
    if (!retryAfterHeader) return null;

    // Parse Retry-After header (seconds or HTTP date)
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) {
      return Math.min(seconds * 1000, this.retryConfig.maxDelay);
    }

    // Try to parse as HTTP date
    const date = new Date(retryAfterHeader);
    if (!isNaN(date.getTime())) {
      const delay = date.getTime() - Date.now();
      return Math.max(0, Math.min(delay, this.retryConfig.maxDelay));
    }

    return null;
  }

  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('401') || // Unauthorized
      message.includes('403') || // Forbidden
      message.includes('400') || // Bad Request
      message.includes('404') || // Not Found
      message.includes('invalid') ||
      message.includes('authentication') ||
      message.includes('authorization')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus();
  }
}

// Global circuit breakers per service
export class CircuitBreakerManager {
  private static breakers = new Map<string, ResilientApiClient>();

  static getClient(serviceName: string): ResilientApiClient {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new ResilientApiClient());
    }
    return this.breakers.get(serviceName)!;
  }

  static getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    for (const [name, client] of this.breakers) {
      status[name] = client.getCircuitBreakerStatus();
    }
    return status;
  }

  static resetAll() {
    this.breakers.clear();
  }
}