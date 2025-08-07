/**
 * Health Check System
 * Monitors database, storage, edge functions, and network connectivity
 */

import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface SystemHealth {
  database: HealthStatus;
  storage: HealthStatus;
  edgeFunctions: HealthStatus;
  network: HealthStatus;
  memory: HealthStatus;
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
}

class HealthCheckSystem {
  private lastCheck: SystemHealth | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicChecks();
  }

  async performHealthCheck(): Promise<SystemHealth> {
    const timestamp = Date.now();
    
    const [database, storage, edgeFunctions, network, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkEdgeFunctions(),
      this.checkNetwork(),
      this.checkMemory()
    ]);

    const overall = this.determineOverallHealth([database, storage, edgeFunctions, network, memory]);

    const health: SystemHealth = {
      database,
      storage,
      edgeFunctions,
      network,
      memory,
      overall,
      timestamp
    };

    this.lastCheck = health;
    return health;
  }

  private async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Simple query to test database connectivity
      const { data, error } = await supabase
        .from('farms')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          responseTime,
          error: error.message,
          details: { code: error.code }
        };
      }

      return {
        status: responseTime > 2000 ? 'degraded' : 'healthy',
        responseTime,
        details: { recordsAccessible: data?.length ?? 0 }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  private async checkStorage(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test storage by listing buckets
      const { data, error } = await supabase.storage.listBuckets();

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          responseTime,
          error: error.message
        };
      }

      return {
        status: responseTime > 3000 ? 'degraded' : 'healthy',
        responseTime,
        details: { bucketsAvailable: data?.length ?? 0 }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown storage error'
      };
    }
  }

  private async checkEdgeFunctions(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test a simple edge function (ping or health endpoint)
      const { data, error } = await supabase.functions.invoke('health-check', {
        method: 'GET'
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'degraded', // Edge functions being down shouldn't be critical
          responseTime,
          error: error.message
        };
      }

      return {
        status: responseTime > 5000 ? 'degraded' : 'healthy',
        responseTime,
        details: { response: data }
      };
    } catch (error) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Edge functions unavailable'
      };
    }
  }

  private async checkNetwork(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      if (!navigator.onLine) {
        return {
          status: 'unhealthy',
          error: 'No network connection'
        };
      }

      // Test network connectivity with a simple request
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = Date.now() - startTime;

      return {
        status: response.ok ? (responseTime > 3000 ? 'degraded' : 'healthy') : 'degraded',
        responseTime,
        details: {
          online: navigator.onLine,
          effectiveType: (navigator as any).connection?.effectiveType,
          downlink: (navigator as any).connection?.downlink
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Network check failed'
      };
    }
  }

  private checkMemory(): HealthStatus {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (usagePercentage > 90) status = 'unhealthy';
        else if (usagePercentage > 70) status = 'degraded';

        return {
          status,
          details: {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercentage: Math.round(usagePercentage)
          }
        };
      }

      return {
        status: 'healthy',
        details: { message: 'Memory API not available' }
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Memory check failed'
      };
    }
  }

  private determineOverallHealth(statuses: HealthStatus[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = statuses.filter(s => s.status === 'unhealthy').length;
    const degradedCount = statuses.filter(s => s.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 1) return 'degraded';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  private startPeriodicChecks(): void {
    // Perform health check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('Health check failed:', error);
      });
    }, 5 * 60 * 1000);

    // Initial check
    this.performHealthCheck().catch(error => {
      console.error('Initial health check failed:', error);
    });
  }

  getLastHealthCheck(): SystemHealth | null {
    return this.lastCheck;
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const healthCheck = new HealthCheckSystem();
export type { SystemHealth, HealthStatus };