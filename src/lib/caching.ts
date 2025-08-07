import { logger } from './logger';
import { IS_PRODUCTION } from '@/config/environment';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items
  staleWhileRevalidate?: boolean;
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

class ProductionCache {
  private static instance: ProductionCache;
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100;
  private cleanupInterval: NodeJS.Timeout;

  static getInstance(): ProductionCache {
    if (!ProductionCache.instance) {
      ProductionCache.instance = new ProductionCache();
    }
    return ProductionCache.instance;
  }

  constructor() {
    this.startCleanupTimer();
    this.setupStorageEventListener();
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private setupStorageEventListener(): void {
    // Listen for storage events to sync across tabs
    window.addEventListener('storage', (event) => {
      if (event.key?.startsWith('agritool_cache_')) {
        const cacheKey = event.key.replace('agritool_cache_', '');
        if (event.newValue === null) {
          this.cache.delete(cacheKey);
        } else {
          try {
            const item = JSON.parse(event.newValue);
            this.cache.set(cacheKey, item);
          } catch (error) {
            logger.warn('Failed to parse cache item from storage', { key: cacheKey });
          }
        }
      }
    });
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const maxSize = options.maxSize || this.maxSize;

    // Enforce size limit
    if (this.cache.size >= maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, item);

    // Persist to localStorage for cross-tab sync
    try {
      localStorage.setItem(`agritool_cache_${key}`, JSON.stringify(item));
    } catch (error) {
      logger.warn('Failed to persist cache item to localStorage', { key });
    }

    logger.debug('Cache item set', { key, ttl, size: this.cache.size });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      // Try to load from localStorage
      try {
        const stored = localStorage.getItem(`agritool_cache_${key}`);
        if (stored) {
          const parsedItem = JSON.parse(stored) as CacheItem<T>;
          if (this.isValid(parsedItem)) {
            this.cache.set(key, parsedItem);
            return this.updateAccessStats(key, parsedItem);
          } else {
            localStorage.removeItem(`agritool_cache_${key}`);
          }
        }
      } catch (error) {
        logger.warn('Failed to load cache item from localStorage', { key });
      }
      return null;
    }

    if (!this.isValid(item)) {
      this.delete(key);
      return null;
    }

    return this.updateAccessStats(key, item);
  }

  private updateAccessStats<T>(key: string, item: CacheItem<T>): T {
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.cache.set(key, item);
    return item.data;
  }

  private isValid<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  delete(key: string): void {
    this.cache.delete(key);
    localStorage.removeItem(`agritool_cache_${key}`);
    logger.debug('Cache item deleted', { key });
  }

  clear(): void {
    this.cache.clear();
    
    // Clear from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('agritool_cache_')) {
        localStorage.removeItem(key);
      }
    });

    logger.debug('Cache cleared');
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (!this.isValid(item)) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cache cleanup completed', { cleanedCount, remainingSize: this.cache.size });
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      logger.debug('Evicted least recently used cache item', { key: oldestKey });
    }
  }

  // Utility methods
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  getStats(): { size: number; hitRate: number; totalAccess: number } {
    let totalAccess = 0;
    for (const item of this.cache.values()) {
      totalAccess += item.accessCount;
    }

    return {
      size: this.cache.size,
      hitRate: totalAccess > 0 ? (this.cache.size / totalAccess) * 100 : 0,
      totalAccess
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Specialized cache implementations
export class DocumentCache extends ProductionCache {
  private static docInstance: DocumentCache;

  static getInstance(): DocumentCache {
    if (!DocumentCache.docInstance) {
      DocumentCache.docInstance = new DocumentCache();
    }
    return DocumentCache.docInstance;
  }

  cacheDocument(id: string, document: any): void {
    this.set(`doc_${id}`, document, { ttl: 10 * 60 * 1000 }); // 10 minutes
  }

  getDocument(id: string): any {
    return this.get(`doc_${id}`);
  }

  cacheExtractionResult(documentId: string, result: any): void {
    this.set(`extraction_${documentId}`, result, { ttl: 30 * 60 * 1000 }); // 30 minutes
  }

  getExtractionResult(documentId: string): any {
    return this.get(`extraction_${documentId}`);
  }
}

export class SubsidyCache extends ProductionCache {
  private static subsidyInstance: SubsidyCache;

  static getInstance(): SubsidyCache {
    if (!SubsidyCache.subsidyInstance) {
      SubsidyCache.subsidyInstance = new SubsidyCache();
    }
    return SubsidyCache.subsidyInstance;
  }

  cacheSubsidies(region: string, subsidies: any[]): void {
    this.set(`subsidies_${region}`, subsidies, { ttl: 60 * 60 * 1000 }); // 1 hour
  }

  getSubsidies(region: string): any[] | null {
    return this.get(`subsidies_${region}`);
  }

  cacheSubsidyDetails(id: string, details: any): void {
    this.set(`subsidy_${id}`, details, { ttl: 30 * 60 * 1000 }); // 30 minutes
  }

  getSubsidyDetails(id: string): any {
    return this.get(`subsidy_${id}`);
  }
}

export const cache = ProductionCache.getInstance();
export const documentCache = DocumentCache.getInstance();
export const subsidyCache = SubsidyCache.getInstance();