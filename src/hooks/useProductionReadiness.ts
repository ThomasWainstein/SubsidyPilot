/**
 * Production Readiness Hook
 * Unified access to system health, security, performance, and cache metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { prodMonitoring } from '@/lib/monitoring';
import { healthCheck, SystemHealth } from '@/lib/healthCheck';
import { security, SecurityMetrics } from '@/lib/security';
import { productionCache, documentCache, subsidyCache } from '@/lib/caching';
import { productionConfig } from '@/config/production';

interface ProductionMetrics {
  health: SystemHealth | null;
  performance: ReturnType<typeof prodMonitoring.getMetrics>;
  security: SecurityMetrics;
  caching: {
    production: ReturnType<typeof productionCache.getStats>;
    documents: ReturnType<typeof documentCache.getStats>;
    subsidies: ReturnType<typeof subsidyCache.getStats>;
  };
  config: typeof productionConfig;
}

interface ProductionReadinessState {
  metrics: ProductionMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface ProductionActions {
  refreshMetrics: () => Promise<void>;
  runHealthCheck: () => Promise<SystemHealth>;
  clearCache: (type?: 'production' | 'documents' | 'subsidies' | 'all') => void;
  trackEvent: (name: string, properties?: Record<string, any>) => void;
  generateReport: (format?: 'json' | 'summary') => string;
}

export function useProductionReadiness(): ProductionReadinessState & ProductionActions {
  const [state, setState] = useState<ProductionReadinessState>({
    metrics: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  const collectMetrics = useCallback(async (): Promise<ProductionMetrics> => {
    const [health, performance, securityMetrics] = await Promise.all([
      healthCheck.performHealthCheck(),
      Promise.resolve(prodMonitoring.getMetrics()),
      Promise.resolve(security.getMetrics())
    ]);

    const caching = {
      production: productionCache.getStats(),
      documents: documentCache.getStats(),
      subsidies: subsidyCache.getStats()
    };

    return {
      health,
      performance,
      security: securityMetrics,
      caching,
      config: productionConfig
    };
  }, []);

  const refreshMetrics = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const metrics = await collectMetrics();
      setState({
        metrics,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to collect metrics'
      }));
    }
  }, [collectMetrics]);

  const runHealthCheck = useCallback(async (): Promise<SystemHealth> => {
    const health = await healthCheck.performHealthCheck();
    
    setState(prev => ({
      ...prev,
      metrics: prev.metrics ? {
        ...prev.metrics,
        health
      } : null,
      lastUpdated: Date.now()
    }));

    return health;
  }, []);

  const clearCache = useCallback((type?: 'production' | 'documents' | 'subsidies' | 'all') => {
    switch (type) {
      case 'production':
        productionCache.clear();
        break;
      case 'documents':
        documentCache.clear();
        break;
      case 'subsidies':
        subsidyCache.clear();
        break;
      case 'all':
      default:
        productionCache.clear();
        documentCache.clear();
        subsidyCache.clear();
        break;
    }

    // Refresh metrics to reflect cache clearing
    refreshMetrics();
  }, [refreshMetrics]);

  const trackEvent = useCallback((name: string, properties?: Record<string, any>) => {
    prodMonitoring.trackCustomEvent(name, properties);
  }, []);

  const generateReport = useCallback((format: 'json' | 'summary' = 'summary'): string => {
    if (!state.metrics) {
      return 'No metrics available';
    }

    if (format === 'json') {
      return JSON.stringify(state.metrics, null, 2);
    }

    const { health, performance, security, caching } = state.metrics;
    
    return `
# Production Readiness Report
Generated: ${new Date().toISOString()}

## Overall System Health: ${health?.overall?.toUpperCase() || 'UNKNOWN'}

### Health Status
- Database: ${health?.database.status} (${health?.database.responseTime}ms)
- Storage: ${health?.storage.status} (${health?.storage.responseTime}ms)
- Edge Functions: ${health?.edgeFunctions.status} (${health?.edgeFunctions.responseTime}ms)
- Network: ${health?.network.status}
- Memory: ${health?.memory.status}

### Performance Metrics
- LCP: ${performance.performance.lcp?.toFixed(2)}ms
- FCP: ${performance.performance.fcp?.toFixed(2)}ms
- CLS: ${performance.performance.cls?.toFixed(3)}
- Memory Usage: ${performance.memory?.usagePercentage?.toFixed(1)}%

### Security Status
- Total Uploads: ${security.totalUploads}
- Blocked Uploads: ${security.blockedUploads}
- Rate Limit Hits: ${security.rateLimitHits}
- CSP Violations: ${security.cspViolations}

### Cache Performance
- Production Cache: ${caching.production.size}/${caching.production.maxSize} items (${(caching.production.hitRate * 100).toFixed(1)}% hit rate)
- Document Cache: ${caching.documents.size}/${caching.documents.maxSize} items
- Subsidy Cache: ${caching.subsidies.size}/${caching.subsidies.maxSize} items

### Recommendations
${health?.overall === 'healthy' ? '✅ System is operating normally' : '⚠️  System requires attention'}
${performance.memory?.usagePercentage > 80 ? '⚠️  High memory usage detected' : '✅ Memory usage is normal'}
${security.blockedUploads > 10 ? '⚠️  High number of blocked uploads' : '✅ Security threats are minimal'}
    `.trim();
  }, [state.metrics]);

  // Initial metrics collection and periodic updates
  useEffect(() => {
    refreshMetrics();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);

    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return {
    ...state,
    refreshMetrics,
    runHealthCheck,
    clearCache,
    trackEvent,
    generateReport
  };
}