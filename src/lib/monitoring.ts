import { logger } from './logger';
import { IS_PRODUCTION } from '@/config/environment';

export interface ErrorReport {
  message: string;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  context?: Record<string, any>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  userId?: string;
  context?: Record<string, any>;
}

class ProductionMonitoring {
  private static instance: ProductionMonitoring;
  private errorQueue: ErrorReport[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private isOnline = navigator.onLine;

  static getInstance(): ProductionMonitoring {
    if (!ProductionMonitoring.instance) {
      ProductionMonitoring.instance = new ProductionMonitoring();
    }
    return ProductionMonitoring.instance;
  }

  constructor() {
    this.setupGlobalErrorHandling();
    this.setupPerformanceObserver();
    this.setupNetworkMonitoring();
    this.startBatchProcessor();
  }

  private setupGlobalErrorHandling(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        timestamp: Date.now(),
        level: 'error',
        context: {
          line: event.lineno,
          column: event.colno,
          type: 'javascript_error'
        }
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        level: 'error',
        context: {
          type: 'promise_rejection',
          reason: event.reason
        }
      });
    });
  }

  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Monitor Core Web Vitals
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.captureMetric({
              name: 'LCP',
              value: entry.startTime,
              timestamp: Date.now(),
              context: { type: 'core_web_vitals' }
            });
          }
          
          if (entry.entryType === 'first-input') {
            this.captureMetric({
              name: 'FID',
              value: (entry as any).processingStart - entry.startTime,
              timestamp: Date.now(),
              context: { type: 'core_web_vitals' }
            });
          }

          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            this.captureMetric({
              name: 'CLS',
              value: (entry as any).value,
              timestamp: Date.now(),
              context: { type: 'core_web_vitals' }
            });
          }
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (error) {
      logger.warn('Performance observer not supported', { error });
    }
  }

  private setupNetworkMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processBatches();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startBatchProcessor(): void {
    setInterval(() => {
      if (this.isOnline) {
        this.processBatches();
      }
    }, 30000); // Process every 30 seconds
  }

  captureError(error: Partial<ErrorReport>): void {
    const errorReport: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: error.timestamp || Date.now(),
      level: error.level || 'error',
      context: error.context
    };

    this.errorQueue.push(errorReport);
    logger.error('Error captured', new Error(errorReport.message), errorReport.context);

    // Immediate processing for critical errors in production
    if (IS_PRODUCTION && errorReport.level === 'error') {
      this.processBatches();
    }
  }

  captureMetric(metric: PerformanceMetric): void {
    this.metricsQueue.push(metric);

    // Log performance issues
    if (metric.name === 'LCP' && metric.value > 2500) {
      logger.warn('Poor LCP detected', { value: metric.value });
    }
    if (metric.name === 'FID' && metric.value > 100) {
      logger.warn('Poor FID detected', { value: metric.value });
    }
    if (metric.name === 'CLS' && metric.value > 0.1) {
      logger.warn('Poor CLS detected', { value: metric.value });
    }
  }

  private async processBatches(): Promise<void> {
    if (!this.isOnline || (!this.errorQueue.length && !this.metricsQueue.length)) {
      return;
    }

    try {
      if (this.errorQueue.length > 0) {
        await this.sendErrors([...this.errorQueue]);
        this.errorQueue = [];
      }

      if (this.metricsQueue.length > 0) {
        await this.sendMetrics([...this.metricsQueue]);
        this.metricsQueue = [];
      }
    } catch (error) {
      logger.error('Failed to send monitoring data', error as Error);
    }
  }

  private async sendErrors(errors: ErrorReport[]): Promise<void> {
    if (!IS_PRODUCTION) {
      logger.debug('Would send errors to monitoring service', { count: errors.length });
      return;
    }

    // In production, send to actual monitoring service
    // TODO: Replace with actual service (Sentry, LogRocket, etc.)
    try {
      const response = await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send error reports', error as Error);
    }
  }

  private async sendMetrics(metrics: PerformanceMetric[]): Promise<void> {
    if (!IS_PRODUCTION) {
      logger.debug('Would send metrics to monitoring service', { count: metrics.length });
      return;
    }

    // In production, send to actual monitoring service
    try {
      const response = await fetch('/api/monitoring/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send performance metrics', error as Error);
    }
  }

  // Manual reporting methods
  reportUserAction(action: string, context?: Record<string, any>): void {
    this.captureMetric({
      name: 'user_action',
      value: 1,
      timestamp: Date.now(),
      context: { action, ...context }
    });
  }

  reportFeatureUsage(feature: string, duration?: number): void {
    this.captureMetric({
      name: 'feature_usage',
      value: duration || 1,
      timestamp: Date.now(),
      context: { feature }
    });
  }
}

export const monitoring = ProductionMonitoring.getInstance();