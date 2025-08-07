import { logger } from './logger';
import { monitoring } from './monitoring';
import { PRODUCTION_CONFIG } from '@/config/production';

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercentage: number;
  isNearLimit: boolean;
  isCritical: boolean;
}

export interface ResourcePool<T> {
  available: T[];
  inUse: Set<T>;
  maxSize: number;
  factory: () => T;
  destroyer?: (resource: T) => void;
}

class MemoryManager {
  private static instance: MemoryManager;
  private memoryThresholds = {
    warning: 0.7, // 70%
    critical: 0.9  // 90%
  };
  private resourcePools = new Map<string, ResourcePool<any>>();
  private cleanupCallbacks: (() => void)[] = [];
  private weakRefs = new Map<string, any>();

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  constructor() {
    this.startMemoryMonitoring();
    this.setupMemoryCleanup();
  }

  // Memory monitoring
  getCurrentMemoryUsage(): MemoryMetrics | null {
    if (!('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage,
      isNearLimit: usagePercentage >= this.memoryThresholds.warning * 100,
      isCritical: usagePercentage >= this.memoryThresholds.critical * 100
    };
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const metrics = this.getCurrentMemoryUsage();
      if (!metrics) return;

      // Report memory metrics
      monitoring.captureMetric({
        name: 'memory_usage_percentage',
        value: metrics.usagePercentage,
        timestamp: Date.now(),
        context: {
          usedMB: Math.round(metrics.usedJSHeapSize / 1024 / 1024),
          limitMB: Math.round(metrics.jsHeapSizeLimit / 1024 / 1024)
        }
      });

      // Trigger cleanup if near limit
      if (metrics.isCritical) {
        logger.warn('Critical memory usage detected', {
          usagePercentage: metrics.usagePercentage.toFixed(2),
          usedMB: Math.round(metrics.usedJSHeapSize / 1024 / 1024)
        });
        this.forceCleanup();
      } else if (metrics.isNearLimit) {
        logger.warn('High memory usage detected', {
          usagePercentage: metrics.usagePercentage.toFixed(2)
        });
        this.performCleanup();
      }
    }, 10000); // Check every 10 seconds
  }

  // Resource pooling
  createResourcePool<T>(
    name: string,
    factory: () => T,
    options: {
      maxSize?: number;
      destroyer?: (resource: T) => void;
      warmupSize?: number;
    } = {}
  ): void {
    const { maxSize = 10, destroyer, warmupSize = 2 } = options;

    const pool: ResourcePool<T> = {
      available: [],
      inUse: new Set(),
      maxSize,
      factory,
      destroyer
    };

    // Warmup the pool
    for (let i = 0; i < warmupSize; i++) {
      pool.available.push(factory());
    }

    this.resourcePools.set(name, pool);
    logger.info(`Resource pool created: ${name}`, { maxSize, warmupSize });
  }

  acquireResource<T>(poolName: string): T | null {
    const pool = this.resourcePools.get(poolName) as ResourcePool<T>;
    if (!pool) {
      logger.error(`Resource pool not found: ${poolName}`);
      return null;
    }

    let resource: T;

    if (pool.available.length > 0) {
      resource = pool.available.pop()!;
    } else if (pool.inUse.size < pool.maxSize) {
      resource = pool.factory();
    } else {
      logger.warn(`Resource pool exhausted: ${poolName}`);
      return null;
    }

    pool.inUse.add(resource);
    return resource;
  }

  releaseResource<T>(poolName: string, resource: T): void {
    const pool = this.resourcePools.get(poolName) as ResourcePool<T>;
    if (!pool || !pool.inUse.has(resource)) {
      return;
    }

    pool.inUse.delete(resource);
    pool.available.push(resource);
  }

  destroyResourcePool(poolName: string): void {
    const pool = this.resourcePools.get(poolName);
    if (!pool) return;

    // Destroy all resources
    if (pool.destroyer) {
      [...pool.available, ...pool.inUse].forEach(pool.destroyer);
    }

    this.resourcePools.delete(poolName);
    logger.info(`Resource pool destroyed: ${poolName}`);
  }

  // Weak reference management for preventing memory leaks
  setWeakReference(key: string, object: any): void {
    this.weakRefs.set(key, object);
  }

  getWeakReference(key: string): any | null {
    return this.weakRefs.get(key) || null;
  }

  // Memory cleanup strategies
  registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  private performCleanup(): void {
    logger.info('Performing memory cleanup');
    
    // Run registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error('Cleanup callback failed', error as Error);
      }
    });

    // Clean up weak references
    this.cleanupWeakReferences();

    // Clean up resource pools
    this.cleanupResourcePools();

    // Suggest garbage collection
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  private forceCleanup(): void {
    logger.warn('Performing force cleanup due to critical memory usage');
    
    this.performCleanup();

    // Additional aggressive cleanup
    this.resourcePools.forEach((pool, name) => {
      // Reduce pool size
      const reduceBy = Math.floor(pool.available.length / 2);
      const toDestroy = pool.available.splice(0, reduceBy);
      
      if (pool.destroyer) {
        toDestroy.forEach(pool.destroyer);
      }

      logger.info(`Reduced resource pool size: ${name}`, { reducedBy: reduceBy });
    });
  }

  private cleanupWeakReferences(): void {
    let cleanedCount = 0;
    
    for (const [key, ref] of this.weakRefs.entries()) {
      if (!ref.deref()) {
        this.weakRefs.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up weak references', { count: cleanedCount });
    }
  }

  private cleanupResourcePools(): void {
    this.resourcePools.forEach((pool, name) => {
      // Release unused resources
      const unused = pool.available.splice(2); // Keep minimum 2
      if (pool.destroyer) {
        unused.forEach(pool.destroyer);
      }

      if (unused.length > 0) {
        logger.debug(`Cleaned up resource pool: ${name}`, { releasedCount: unused.length });
      }
    });
  }

  private setupMemoryCleanup(): void {
    // Register cleanup for common memory leaks
    this.registerCleanupCallback(() => {
      // Clear expired cache entries
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            if (cacheName.includes('expired') || cacheName.includes('temp')) {
              caches.delete(cacheName);
            }
          });
        });
      }
    });

    // Cleanup on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCleanup();
      }
    });

    // Cleanup before page unload
    window.addEventListener('beforeunload', () => {
      this.forceCleanup();
    });
  }

  // Object size estimation
  estimateObjectSize(obj: any): number {
    const seen = new WeakSet();
    
    function sizeOf(obj: any): number {
      if (obj === null || typeof obj !== 'object') {
        return 0;
      }

      if (seen.has(obj)) {
        return 0;
      }
      seen.add(obj);

      let size = 0;

      if (Array.isArray(obj)) {
        size += obj.length * 8; // Approximate array overhead
        for (const item of obj) {
          size += sizeOf(item);
        }
      } else {
        const keys = Object.keys(obj);
        size += keys.length * 8; // Approximate object overhead
        
        for (const key of keys) {
          size += key.length * 2; // String keys
          size += sizeOf(obj[key]);
        }
      }

      return size;
    }

    return sizeOf(obj);
  }

  // Memory optimization utilities
  createMemoizedFunction<T extends (...args: any[]) => any>(
    fn: T,
    options: {
      maxCacheSize?: number;
      ttl?: number;
      keyGenerator?: (...args: Parameters<T>) => string;
    } = {}
  ): T {
    const { maxCacheSize = 100, ttl = 300000, keyGenerator } = options;
    const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

    const memoized = ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      const now = Date.now();

      // Check cache
      const cached = cache.get(key);
      if (cached && now - cached.timestamp < ttl) {
        return cached.value;
      }

      // Execute function
      const result = fn(...args);

      // Store in cache with size management
      if (cache.size >= maxCacheSize) {
        // Remove oldest entry
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }

      cache.set(key, { value: result, timestamp: now });
      return result;
    }) as T;

    // Add cache management methods
    (memoized as any).clearCache = () => cache.clear();
    (memoized as any).getCacheSize = () => cache.size;

    return memoized;
  }

  // Statistics
  getMemoryStats(): {
    currentUsage: MemoryMetrics | null;
    resourcePools: Record<string, { available: number; inUse: number; maxSize: number }>;
    weakReferences: number;
    cleanupCallbacks: number;
  } {
    const poolStats: Record<string, { available: number; inUse: number; maxSize: number }> = {};
    
    this.resourcePools.forEach((pool, name) => {
      poolStats[name] = {
        available: pool.available.length,
        inUse: pool.inUse.size,
        maxSize: pool.maxSize
      };
    });

    return {
      currentUsage: this.getCurrentMemoryUsage(),
      resourcePools: poolStats,
      weakReferences: this.weakRefs.size,
      cleanupCallbacks: this.cleanupCallbacks.length
    };
  }
}

export const memoryManager = MemoryManager.getInstance();