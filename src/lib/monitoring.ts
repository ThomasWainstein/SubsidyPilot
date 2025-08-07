/**
 * Production Monitoring System
 * Provides global error handling, performance monitoring, and real-time metrics collection
 */

interface PerformanceMetrics {
  lcp?: number;
  fcp?: number;
  cls?: number;
  fid?: number;
  ttfb?: number;
}

interface EnhancedError extends Error {
  level?: string;
  [key: string]: any;
}

interface ErrorReport {
  error: EnhancedError;
  timestamp: number;
  url: string;
  userAgent: string;
  stackTrace?: string;
}

interface NetworkMetrics {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

class ProductionMonitoring {
  private errors: ErrorReport[] = [];
  private metrics: PerformanceMetrics = {};
  private networkMetrics: NetworkMetrics = { isOnline: navigator.onLine };
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeErrorHandling();
    this.initializePerformanceMonitoring();
    this.initializeNetworkMonitoring();
  }

  private initializeErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        type: 'unhandledrejection'
      });
    });
  }

  private initializePerformanceMonitoring() {
    // Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);

      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
          }
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', fcpObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    }
  }

  private initializeNetworkMonitoring() {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.networkMetrics.isOnline = true;
    });

    window.addEventListener('offline', () => {
      this.networkMetrics.isOnline = false;
    });

    // Network information API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.networkMetrics.effectiveType = connection.effectiveType;
      this.networkMetrics.downlink = connection.downlink;
      this.networkMetrics.rtt = connection.rtt;

      connection.addEventListener('change', () => {
        this.networkMetrics.effectiveType = connection.effectiveType;
        this.networkMetrics.downlink = connection.downlink;
        this.networkMetrics.rtt = connection.rtt;
      });
    }
  }

  captureError(error: EnhancedError | Record<string, any>, context?: Record<string, any>) {
    // Convert error-like objects to proper Error instances
    let actualError: EnhancedError;
    
    if (error instanceof Error) {
      actualError = error as EnhancedError;
    } else if (typeof error === 'object' && error.message) {
      // Create Error from error-like object
      actualError = new Error(error.message) as EnhancedError;
      actualError.name = error.name || 'CustomError';
      actualError.stack = error.stack;
      // Copy additional properties
      Object.keys(error).forEach(key => {
        if (key !== 'message' && key !== 'stack' && key !== 'name') {
          actualError[key] = error[key];
        }
      });
    } else {
      actualError = new Error(String(error)) as EnhancedError;
    }

    const errorReport: ErrorReport = {
      error: actualError,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      stackTrace: actualError.stack
    };

    this.errors.push(errorReport);

    // Keep only last 100 errors to prevent memory issues
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Captured error:', actualError, context);
    }

    // In production, you would send this to your monitoring service
    // Example: Sentry, LogRocket, etc.
  }

  getMetrics() {
    return {
      performance: this.metrics,
      network: this.networkMetrics,
      errors: this.errors.slice(-10), // Last 10 errors
      memory: this.getMemoryInfo(),
      timing: this.getTimingInfo()
    };
  }

  private getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return null;
  }

  private getTimingInfo() {
    const timing = performance.timing;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      windowLoad: timing.loadEventEnd - timing.navigationStart,
      ttfb: timing.responseStart - timing.navigationStart
    };
  }

  trackCustomEvent(name: string, properties?: Record<string, any>) {
    // Custom event tracking for business metrics
    const event = {
      name,
      properties,
      timestamp: Date.now(),
      url: window.location.href
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Custom event:', event);
    }

    // In production, send to analytics service
  }

  // Backward compatibility methods
  captureMetric(metric: string | Record<string, any>, value?: number, tags?: Record<string, string>) {
    if (typeof metric === 'string') {
      this.trackCustomEvent(`metric.${metric}`, { value: value ?? 1, ...tags });
    } else {
      // Handle complex metric objects
      this.trackCustomEvent(`metric.${metric.name || 'unknown'}`, metric);
    }
  }

  reportUserAction(action: string, context?: Record<string, any>) {
    this.trackCustomEvent(`user.${action}`, context);
  }

  reportFeatureUsage(feature: string, usage?: number, context?: Record<string, any>) {
    this.trackCustomEvent(`feature.${feature}`, { usage: usage ?? 1, ...context });
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

export const prodMonitoring = new ProductionMonitoring();

// Backward compatibility export
export const monitoring = prodMonitoring;
