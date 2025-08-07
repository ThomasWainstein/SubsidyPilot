import { useState, useEffect, useCallback } from 'react';
import { monitoring } from '@/lib/monitoring';
import { healthChecker, SystemHealth } from '@/lib/healthCheck';
import { security } from '@/lib/security';
import { cache } from '@/lib/caching';
import { logger } from '@/lib/logger';
import { PRODUCTION_CONFIG } from '@/config/production';

export interface ProductionMetrics {
  systemHealth: SystemHealth | null;
  securityReport: ReturnType<typeof security.getSecurityReport>;
  cacheStats: ReturnType<typeof cache.getStats>;
  performanceMetrics: {
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
  };
  uptime: number;
}

export const useProductionReadiness = () => {
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startTime = useCallback(() => Date.now(), []);

  const collectMetrics = useCallback(async (): Promise<ProductionMetrics> => {
    const start = startTime();

    try {
      // Collect system health
      const systemHealth = await healthChecker.performHealthCheck();

      // Collect security metrics
      const securityReport = security.getSecurityReport();

      // Collect cache statistics
      const cacheStats = cache.getStats();

      // Collect performance metrics
      let memoryUsage = 0;
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
      }

      const responseTime = Date.now() - start;
      const errorRate = systemHealth.checks.filter(c => c.status === 'unhealthy').length / systemHealth.checks.length;

      return {
        systemHealth,
        securityReport,
        cacheStats,
        performanceMetrics: {
          memoryUsage,
          responseTime,
          errorRate
        },
        uptime: Date.now() - start
      };
    } catch (err) {
      logger.error('Failed to collect production metrics', err as Error);
      throw err;
    }
  }, [startTime]);

  const initializeMonitoring = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize production services
      logger.info('Initializing production monitoring...');

      // Start health checks
      healthChecker.startPeriodicHealthChecks(PRODUCTION_CONFIG.MONITORING.HEALTH_CHECK_INTERVAL);

      // Collect initial metrics
      const initialMetrics = await collectMetrics();
      setMetrics(initialMetrics);

      // Report monitoring start
      monitoring.reportFeatureUsage('production_monitoring_started');

      setIsMonitoring(true);
      logger.success('Production monitoring initialized');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to initialize production monitoring', err as Error);
    } finally {
      setLoading(false);
    }
  }, [collectMetrics]);

  const refreshMetrics = useCallback(async () => {
    if (!isMonitoring) return;

    try {
      const updatedMetrics = await collectMetrics();
      setMetrics(updatedMetrics);
    } catch (err) {
      logger.error('Failed to refresh metrics', err as Error);
    }
  }, [collectMetrics, isMonitoring]);

  const stopMonitoring = useCallback(() => {
    healthChecker.stopPeriodicHealthChecks();
    setIsMonitoring(false);
    logger.info('Production monitoring stopped');
  }, []);

  const runHealthCheck = useCallback(async () => {
    try {
      const health = await healthChecker.performHealthCheck();
      setMetrics(prev => prev ? { ...prev, systemHealth: health } : null);
      return health;
    } catch (err) {
      logger.error('Health check failed', err as Error);
      throw err;
    }
  }, []);

  const clearCache = useCallback(() => {
    cache.clear();
    monitoring.reportUserAction('cache_cleared');
    logger.info('Production cache cleared');
  }, []);

  const generateReport = useCallback((): string => {
    if (!metrics) return 'No metrics available';

    const report = {
      timestamp: new Date().toISOString(),
      systemHealth: {
        overall: metrics.systemHealth?.overall || 'unknown',
        services: metrics.systemHealth?.checks.map(c => ({
          service: c.service,
          status: c.status,
          responseTime: c.responseTime
        })) || []
      },
      security: {
        blockedClients: metrics.securityReport.blockedClients,
        securityEvents: metrics.securityReport.securityEvents
      },
      performance: {
        memoryUsage: `${(metrics.performanceMetrics.memoryUsage * 100).toFixed(2)}%`,
        responseTime: `${metrics.performanceMetrics.responseTime}ms`,
        errorRate: `${(metrics.performanceMetrics.errorRate * 100).toFixed(2)}%`
      },
      cache: {
        size: metrics.cacheStats.size,
        hitRate: `${metrics.cacheStats.hitRate.toFixed(2)}%`
      }
    };

    return JSON.stringify(report, null, 2);
  }, [metrics]);

  // Initialize monitoring on mount
  useEffect(() => {
    initializeMonitoring();

    // Cleanup on unmount
    return () => {
      stopMonitoring();
    };
  }, [initializeMonitoring, stopMonitoring]);

  // Periodic metrics refresh
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(refreshMetrics, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [isMonitoring, refreshMetrics]);

  return {
    metrics,
    loading,
    error,
    isMonitoring,
    refreshMetrics,
    runHealthCheck,
    clearCache,
    generateReport,
    stopMonitoring,
    initializeMonitoring
  };
};