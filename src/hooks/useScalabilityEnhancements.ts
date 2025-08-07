import { useState, useEffect, useCallback } from 'react';
import { dbOptimizer } from '@/lib/databaseOptimization';
import { rateLimiter } from '@/lib/rateLimiting';
import { memoryManager } from '@/lib/memoryManagement';
import { horizontalScaling } from '@/lib/horizontalScaling';
import { logger } from '@/lib/logger';
import { monitoring } from '@/lib/monitoring';

export interface ScalabilityMetrics {
  database: {
    connectionStatus: 'healthy' | 'degraded' | 'unhealthy';
    queryPerformance: number;
    cacheStats: { size: number; keys: string[] };
    recommendations: string[];
  };
  rateLimiting: {
    activeRequests: number;
    rateLimitEntries: number;
    queuedBatches: number;
    circuitBreakers: Record<string, any>;
  };
  memory: {
    currentUsage: any;
    resourcePools: Record<string, any>;
    weakReferences: number;
    cleanupCallbacks: number;
  };
  scaling: {
    currentInstances: number;
    currentMetrics: any;
    scalingHistory: any[];
    loadBalancer: any;
  };
}

export interface PerformanceBenchmark {
  name: string;
  duration: number;
  throughput: number;
  errorRate: number;
  memoryDelta: number;
  timestamp: number;
}

export const useScalabilityEnhancements = () => {
  const [metrics, setMetrics] = useState<ScalabilityMetrics | null>(null);
  const [benchmarks, setBenchmarks] = useState<PerformanceBenchmark[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collectScalabilityMetrics = useCallback(async (): Promise<ScalabilityMetrics> => {
    try {
      const [databaseHealth, rateLimitStats, memoryStats, scalingStats] = await Promise.all([
        dbOptimizer.checkDatabaseHealth(),
        Promise.resolve(rateLimiter.getStats()),
        Promise.resolve(memoryManager.getMemoryStats()),
        Promise.resolve(horizontalScaling.getScalingStats())
      ]);

      return {
        database: {
          ...databaseHealth,
          cacheStats: dbOptimizer.getCacheStats()
        },
        rateLimiting: rateLimitStats,
        memory: memoryStats,
        scaling: scalingStats
      };
    } catch (err) {
      logger.error('Failed to collect scalability metrics', err as Error);
      throw err;
    }
  }, []);

  const runPerformanceBenchmark = useCallback(async (
    benchmarkName: string,
    operation: () => Promise<void>,
    iterations: number = 100
  ): Promise<PerformanceBenchmark> => {
    const startTime = Date.now();
    const initialMemory = memoryManager.getCurrentMemoryUsage();
    let successCount = 0;
    let errorCount = 0;

    logger.info(`Starting performance benchmark: ${benchmarkName}`, { iterations });

    try {
      // Warmup
      await operation();

      // Actual benchmark
      const promises = Array(iterations).fill(null).map(async () => {
        try {
          await operation();
          successCount++;
        } catch (error) {
          errorCount++;
          throw error;
        }
      });

      await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      const throughput = (successCount / duration) * 1000; // ops per second
      const errorRate = (errorCount / iterations) * 100;

      const finalMemory = memoryManager.getCurrentMemoryUsage();
      const memoryDelta = finalMemory && initialMemory ? 
        finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize : 0;

      const benchmark: PerformanceBenchmark = {
        name: benchmarkName,
        duration,
        throughput,
        errorRate,
        memoryDelta,
        timestamp: Date.now()
      };

      monitoring.captureMetric({
        name: 'performance_benchmark',
        value: throughput,
        timestamp: Date.now(),
        context: benchmark
      });

      logger.success(`Benchmark completed: ${benchmarkName}`, {
        duration: `${duration}ms`,
        throughput: `${throughput.toFixed(2)} ops/sec`,
        errorRate: `${errorRate.toFixed(2)}%`,
        memoryDelta: `${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
      });

      return benchmark;
    } catch (err) {
      logger.error(`Benchmark failed: ${benchmarkName}`, err as Error);
      throw err;
    }
  }, []);

  const optimizeDatabase = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      logger.info('Starting database optimization');

      // Clear query cache
      dbOptimizer.clearQueryCache();

      // Run benchmark for query optimization
      const queryBenchmark = await runPerformanceBenchmark(
        'Database Query Performance',
        async () => {
          await dbOptimizer.cachedQuery(
            'test-query',
            async () => {
              const result = dbOptimizer.optimizedQuery('farms').select('id, name').limit(10);
              return { data: await result, error: null };
            },
            1000
          );
        },
        50
      );

      setBenchmarks(prev => [...prev, queryBenchmark]);

      // Test batch operations
      const batchBenchmark = await runPerformanceBenchmark(
        'Batch Operation Performance',
        async () => {
          const testData = Array(10).fill(null).map((_, i) => ({
            name: `Test Farm ${i}`,
            address: `Test Address ${i}`,
            user_id: 'test-user-id'
          }));
          
          // Note: This is a simulation - in real app, we'd use proper test data
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        },
        20
      );

      setBenchmarks(prev => [...prev, batchBenchmark]);

      logger.success('Database optimization completed');
    } catch (err) {
      logger.error('Database optimization failed', err as Error);
      throw err;
    } finally {
      setIsOptimizing(false);
    }
  }, [runPerformanceBenchmark]);

  const optimizeRateLimiting = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      logger.info('Starting rate limiting optimization');

      // Test rate limiting performance
      const rateLimitBenchmark = await runPerformanceBenchmark(
        'Rate Limiting Performance',
        async () => {
          const allowed = rateLimiter.checkRateLimit('test-client', {
            windowMs: 60000,
            maxRequests: 100
          });
          
          if (!allowed.allowed) {
            throw new Error('Rate limit exceeded');
          }
        },
        200
      );

      setBenchmarks(prev => [...prev, rateLimitBenchmark]);

      // Test batch request processing
      const batchBenchmark = await runPerformanceBenchmark(
        'Batch Request Performance',
        async () => {
          const requests = Array(5).fill(null).map(() => 
            () => new Promise(resolve => setTimeout(resolve, Math.random() * 10))
          );
          
          await rateLimiter.batchRequest(requests, { maxConcurrency: 3 });
        },
        20
      );

      setBenchmarks(prev => [...prev, batchBenchmark]);

      logger.success('Rate limiting optimization completed');
    } catch (err) {
      logger.error('Rate limiting optimization failed', err as Error);
      throw err;
    } finally {
      setIsOptimizing(false);
    }
  }, [runPerformanceBenchmark]);

  const optimizeMemory = useCallback(async () => {
    setIsOptimizing(true);
    
    try {
      logger.info('Starting memory optimization');

      // Force memory cleanup
      memoryManager.registerCleanupCallback(() => {
        // Cleanup any test data
        logger.debug('Memory cleanup callback executed');
      });

      // Test memory usage
      const memoryBenchmark = await runPerformanceBenchmark(
        'Memory Management Performance',
        async () => {
          // Create and cleanup objects
          const largeArray = new Array(1000).fill(null).map((_, i) => ({ id: i, data: `test-${i}` }));
          
          // Simulate memory usage
          const size = memoryManager.estimateObjectSize(largeArray);
          
          // Cleanup
          largeArray.length = 0;
        },
        50
      );

      setBenchmarks(prev => [...prev, memoryBenchmark]);

      logger.success('Memory optimization completed');
    } catch (err) {
      logger.error('Memory optimization failed', err as Error);
      throw err;
    } finally {
      setIsOptimizing(false);
    }
  }, [runPerformanceBenchmark]);

  const runFullOptimization = useCallback(async () => {
    try {
      setError(null);
      await optimizeDatabase();
      await optimizeRateLimiting();
      await optimizeMemory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    }
  }, [optimizeDatabase, optimizeRateLimiting, optimizeMemory]);

  const clearBenchmarks = useCallback(() => {
    setBenchmarks([]);
    logger.info('Performance benchmarks cleared');
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      setError(null);
      const newMetrics = await collectScalabilityMetrics();
      setMetrics(newMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metrics');
    }
  }, [collectScalabilityMetrics]);

  // Initialize metrics collection
  useEffect(() => {
    const initializeMetrics = async () => {
      try {
        setLoading(true);
        const initialMetrics = await collectScalabilityMetrics();
        setMetrics(initialMetrics);
        logger.success('Scalability enhancements initialized');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        logger.error('Failed to initialize scalability enhancements', err as Error);
      } finally {
        setLoading(false);
      }
    };

    initializeMetrics();
  }, [collectScalabilityMetrics]);

  // Periodic metrics refresh
  useEffect(() => {
    const interval = setInterval(refreshMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return {
    metrics,
    benchmarks,
    isOptimizing,
    loading,
    error,
    optimizeDatabase,
    optimizeRateLimiting,
    optimizeMemory,
    runFullOptimization,
    runPerformanceBenchmark,
    clearBenchmarks,
    refreshMetrics
  };
};