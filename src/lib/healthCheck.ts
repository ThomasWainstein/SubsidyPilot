import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { monitoring } from './monitoring';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  timestamp: number;
}

class HealthChecker {
  private static instance: HealthChecker;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: SystemHealth | null = null;

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];

    // Database connectivity check
    checks.push(await this.checkDatabase());

    // Storage check
    checks.push(await this.checkStorage());

    // Edge functions check
    checks.push(await this.checkEdgeFunctions());

    // Local storage check
    checks.push(await this.checkLocalStorage());

    // Network connectivity check
    checks.push(await this.checkNetworkConnectivity());

    // Memory usage check
    checks.push(await this.checkMemoryUsage());

    // Determine overall health
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    const result: SystemHealth = {
      overall,
      checks,
      timestamp: Date.now()
    };

    this.lastHealthCheck = result;

    // Report health metrics
    monitoring.captureMetric({
      name: 'health_check_duration',
      value: Date.now() - startTime,
      timestamp: Date.now(),
      context: { overall, checkCount: checks.length }
    });

    logger.debug('Health check completed', { 
      overall, 
      duration: Date.now() - startTime,
      results: checks.map(c => ({ service: c.service, status: c.status }))
    });

    return result;
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime,
          error: error.message
        };
      }

      const status = responseTime < 1000 ? 'healthy' : 'degraded';
      
      return {
        service: 'database',
        status,
        responseTime,
        details: { recordCount: data?.length || 0 }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.storage
        .from('farm-documents')
        .list('', { limit: 1 });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          service: 'storage',
          status: 'unhealthy',
          responseTime,
          error: error.message
        };
      }

      const status = responseTime < 1500 ? 'healthy' : 'degraded';

      return {
        service: 'storage',
        status,
        responseTime,
        details: { accessible: true }
      };
    } catch (error) {
      return {
        service: 'storage',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkEdgeFunctions(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('upload-farm-document', {
        body: { healthCheck: true }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          service: 'edge_functions',
          status: 'unhealthy',
          responseTime,
          error: error.message
        };
      }

      const status = responseTime < 2000 ? 'healthy' : 'degraded';

      return {
        service: 'edge_functions',
        status,
        responseTime,
        details: { response: data }
      };
    } catch (error) {
      return {
        service: 'edge_functions',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkLocalStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const testKey = '__health_check_test__';
      const testValue = Date.now().toString();
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      const responseTime = Date.now() - startTime;

      if (retrieved !== testValue) {
        return {
          service: 'local_storage',
          status: 'unhealthy',
          responseTime,
          error: 'Local storage read/write failed'
        };
      }

      return {
        service: 'local_storage',
        status: 'healthy',
        responseTime,
        details: { accessible: true }
      };
    } catch (error) {
      return {
        service: 'local_storage',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.github.com/zen', { 
        method: 'GET',
        cache: 'no-cache'
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          service: 'network',
          status: 'degraded',
          responseTime,
          error: `HTTP ${response.status}`
        };
      }

      const status = responseTime < 1000 ? 'healthy' : 'degraded';

      return {
        service: 'network',
        status,
        responseTime,
        details: { online: navigator.onLine }
      };
    } catch (error) {
      return {
        service: 'network',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      let memoryInfo: any = {};
      
      // Check for performance.memory (Chrome/Edge)
      if ('memory' in performance) {
        memoryInfo = (performance as any).memory;
      }

      const responseTime = Date.now() - startTime;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (memoryInfo.usedJSHeapSize) {
        const usageRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        if (usageRatio > 0.9) {
          status = 'unhealthy';
        } else if (usageRatio > 0.7) {
          status = 'degraded';
        }
      }

      return {
        service: 'memory',
        status,
        responseTime,
        details: {
          ...memoryInfo,
          usageRatio: memoryInfo.usedJSHeapSize ? 
            (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit * 100).toFixed(2) + '%' : 
            'unavailable'
        }
      };
    } catch (error) {
      return {
        service: 'memory',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  startPeriodicHealthChecks(intervalMs: number = 300000): void { // Default: 5 minutes
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        
        if (health.overall !== 'healthy') {
          logger.warn('System health degraded', { 
            overall: health.overall,
            issues: health.checks.filter(c => c.status !== 'healthy')
          });
        }
      } catch (error) {
        logger.error('Health check failed', error as Error);
      }
    }, intervalMs);

    logger.info('Periodic health checks started', { intervalMs });
  }

  stopPeriodicHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Periodic health checks stopped');
    }
  }

  getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }
}

export const healthChecker = HealthChecker.getInstance();