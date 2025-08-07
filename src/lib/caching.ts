/**
 * Advanced Caching System
 * Multi-layer caching with memory + localStorage, cross-tab sync, and LRU eviction
 */

interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  syncTabs: boolean;
  persistToStorage: boolean;
}

class AdvancedCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;
  private name: string;

  constructor(name: string, config: Partial<CacheConfig> = {}) {
    this.name = name;
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      syncTabs: true,
      persistToStorage: true,
      ...config
    };

    this.loadFromStorage();
    this.setupTabSync();
    this.setupCleanupInterval();
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const item: CacheItem<T> = {
      value,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    };

    // LRU eviction if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, item);
    this.persistToStorage();
    this.broadcastChange(key, value);
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.persistToStorage();
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = now;

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.persistToStorage();
      this.broadcastChange(key, null);
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.persistToStorage();
    this.broadcastClear();
  }

  getStats() {
    const items = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalAccesses: items.reduce((sum, item) => sum + item.accessCount, 0),
      oldestItem: Math.min(...items.map(item => item.timestamp)),
      newestItem: Math.max(...items.map(item => item.timestamp)),
      hitRate: this.calculateHitRate()
    };
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const stored = localStorage.getItem(`cache_${this.name}`);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // Only load non-expired items
        Object.entries(data).forEach(([key, item]: [string, any]) => {
          if (now - item.timestamp <= item.ttl) {
            this.cache.set(key, item);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private persistToStorage(): void {
    if (!this.config.persistToStorage) return;

    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(`cache_${this.name}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist cache to storage:', error);
    }
  }

  private setupTabSync(): void {
    if (!this.config.syncTabs) return;

    window.addEventListener('storage', (event) => {
      if (event.key === `cache_sync_${this.name}`) {
        const data = event.newValue ? JSON.parse(event.newValue) : null;
        if (data) {
          if (data.action === 'set') {
            this.cache.set(data.key, data.value);
          } else if (data.action === 'delete') {
            this.cache.delete(data.key);
          } else if (data.action === 'clear') {
            this.cache.clear();
          }
        }
      }
    });
  }

  private broadcastChange(key: string, value: T | null): void {
    if (!this.config.syncTabs) return;

    const action = value === null ? 'delete' : 'set';
    const data = { action, key, value, timestamp: Date.now() };
    
    try {
      localStorage.setItem(`cache_sync_${this.name}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to broadcast cache change:', error);
    }
  }

  private broadcastClear(): void {
    if (!this.config.syncTabs) return;

    const data = { action: 'clear', timestamp: Date.now() };
    
    try {
      localStorage.setItem(`cache_sync_${this.name}`, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to broadcast cache clear:', error);
    }
  }

  private setupCleanupInterval(): void {
    // Clean up expired items every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > item.ttl) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.cache.delete(key));
      
      if (keysToDelete.length > 0) {
        this.persistToStorage();
      }
    }, 5 * 60 * 1000);
  }

  private calculateHitRate(): number {
    // This would be tracked separately in a real implementation
    // For now, return a placeholder
    return 0.75;
  }
}

// Specialized cache instances
export const productionCache = new AdvancedCache('production', {
  maxSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  syncTabs: true,
  persistToStorage: true
});

export const documentCache = new AdvancedCache('documents', {
  maxSize: 50,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  syncTabs: false,
  persistToStorage: true
});

export const subsidyCache = new AdvancedCache('subsidies', {
  maxSize: 150,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  syncTabs: true,
  persistToStorage: true
});

export type ProductionCache = typeof productionCache;
export type DocumentCache = typeof documentCache;
export type SubsidyCache = typeof subsidyCache;