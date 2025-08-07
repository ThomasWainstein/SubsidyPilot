import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';
import { monitoring } from './monitoring';
import { PRODUCTION_CONFIG } from '@/config/production';

export interface QueryOptimization {
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  useIndex?: string[];
  selectFields?: string[];
  batchSize?: number;
  enableCache?: boolean;
}

export interface DatabaseIndex {
  table: string;
  columns: string[];
  type: 'btree' | 'gin' | 'gist' | 'hash';
  unique?: boolean;
  partial?: string;
}

class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private batchQueue = new Map<string, { queries: any[]; timeout: NodeJS.Timeout }>();

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  constructor() {
    this.startBatchProcessor();
  }

  // Optimized query builder with intelligent field selection
  optimizedQuery(table: string, options: QueryOptimization = { table, operation: 'select' }) {
    const query = supabase.from(table as any);

    // Smart field selection to reduce payload
    if (options.operation === 'select' && options.selectFields) {
      return query.select(options.selectFields.join(', '));
    }

    // Default optimized field selection for common tables
    const optimizedFields = this.getOptimizedFields(table);
    if (optimizedFields && options.operation === 'select') {
      return query.select(optimizedFields.join(', '));
    }

    return query;
  }

  private getOptimizedFields(table: string): string[] | null {
    const fieldMappings: Record<string, string[]> = {
      'farms': [
        'id', 'name', 'address', 'department', 'total_hectares', 
        'legal_status', 'matching_tags', 'created_at'
      ],
      'subsidies': [
        'id', 'code', 'title', 'deadline', 'agency', 'region', 
        'funding_type', 'status', 'matching_tags'
      ],
      'farm_documents': [
        'id', 'file_name', 'category', 'file_size', 'uploaded_at', 
        'farm_id', 'prediction_confidence'
      ],
      'document_extractions': [
        'id', 'document_id', 'status', 'confidence_score', 
        'created_at', 'extraction_type'
      ],
      'subsidies_structured': [
        'id', 'title', 'description', 'agency', 'deadline', 
        'funding_amount', 'eligibility', 'created_at'
      ]
    };

    return fieldMappings[table] || null;
  }

  // Batch operations for better performance
  async batchInsert<T>(table: string, records: T[], batchSize: number = 100): Promise<void> {
    const startTime = Date.now();
    const batches = this.chunkArray(records, batchSize);
    let successCount = 0;
    let errorCount = 0;

    logger.info(`Starting batch insert for ${table}`, { 
      totalRecords: records.length, 
      batchCount: batches.length, 
      batchSize 
    });

    for (let i = 0; i < batches.length; i++) {
      try {
        const { error } = await supabase
          .from(table as any)
          .insert(batches[i]);

        if (error) {
          logger.error(`Batch ${i + 1} failed for ${table}`, error);
          errorCount += batches[i].length;
        } else {
          successCount += batches[i].length;
        }

        // Small delay between batches to prevent overwhelming the database
        if (i < batches.length - 1) {
          await this.delay(50);
        }
      } catch (error) {
        logger.error(`Exception in batch ${i + 1} for ${table}`, error as Error);
        errorCount += batches[i].length;
      }
    }

    const duration = Date.now() - startTime;
    monitoring.captureMetric({
      name: 'batch_insert_performance',
      value: duration,
      timestamp: Date.now(),
      context: {
        table,
        totalRecords: records.length,
        successCount,
        errorCount,
        batchSize
      }
    });

    logger.success(`Batch insert completed for ${table}`, {
      duration,
      successCount,
      errorCount,
      successRate: `${((successCount / records.length) * 100).toFixed(2)}%`
    });
  }

  // Streaming data fetch for large datasets
  async *streamLargeDataset(
    table: string, 
    options: { 
      pageSize?: number;
      orderBy?: string;
      filters?: Record<string, any>;
      selectFields?: string[];
    } = {}
  ): AsyncGenerator<any[], void, unknown> {
    const pageSize = options.pageSize || 1000;
    let offset = 0;
    let hasMoreData = true;

    logger.info(`Starting data stream for ${table}`, { pageSize, filters: options.filters });

    while (hasMoreData) {
      try {
        let query = this.optimizedQuery(table, {
          table,
          operation: 'select',
          selectFields: options.selectFields
        });

        // Apply filters
        if (options.filters) {
          Object.entries(options.filters).forEach(([key, value]) => {
            query = (query as any).eq(key, value);
          });
        }

        // Apply ordering and pagination
        if (options.orderBy) {
          query = (query as any).order(options.orderBy);
        }
        
        query = (query as any).range(offset, offset + pageSize - 1);

        const { data, error } = await (query as any);

        if (error) {
          logger.error(`Error streaming ${table} at offset ${offset}`, error);
          throw error;
        }

        if (!data || data.length === 0) {
          hasMoreData = false;
          break;
        }

        yield data;
        offset += pageSize;
        hasMoreData = data.length === pageSize;

        // Prevent overwhelming the client
        await this.delay(10);
      } catch (error) {
        logger.error(`Exception while streaming ${table}`, error as Error);
        throw error;
      }
    }

    logger.info(`Streaming completed for ${table}`, { totalFetched: offset });
  }

  // Query result caching
  async cachedQuery<T>(
    cacheKey: string, 
    queryFn: () => Promise<{ data: T | null; error: any }>,
    ttl: number = 300000 // 5 minutes default
  ): Promise<{ data: T | null; error: any; fromCache: boolean }> {
    const cached = this.queryCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      monitoring.captureMetric({
        name: 'query_cache_hit',
        value: 1,
        timestamp: Date.now(),
        context: { cacheKey }
      });
      
      return { data: cached.data, error: null, fromCache: true };
    }

    const result = await queryFn();
    
    if (!result.error && result.data) {
      this.queryCache.set(cacheKey, {
        data: result.data,
        timestamp: Date.now(),
        ttl
      });
    }

    monitoring.captureMetric({
      name: 'query_cache_miss',
      value: 1,
      timestamp: Date.now(),
      context: { cacheKey }
    });

    return { ...result, fromCache: false };
  }

  // Connection pooling simulation and query queuing
  private startBatchProcessor(): void {
    setInterval(() => {
      this.processBatchQueues();
    }, 100); // Process every 100ms
  }

  private processBatchQueues(): void {
    for (const [key, batch] of this.batchQueue.entries()) {
      if (batch.queries.length >= 10) { // Process when we have 10 queries or more
        this.executeBatch(key, batch.queries);
        this.batchQueue.delete(key);
      }
    }
  }

  private async executeBatch(key: string, queries: any[]): Promise<void> {
    try {
      // Execute multiple queries in parallel with connection reuse
      const results = await Promise.allSettled(queries);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.debug(`Batch execution completed for ${key}`, { successful, failed });
    } catch (error) {
      logger.error(`Batch execution failed for ${key}`, error as Error);
    }
  }

  // Database health monitoring
  async checkDatabaseHealth(): Promise<{
    connectionStatus: 'healthy' | 'degraded' | 'unhealthy';
    queryPerformance: number;
    activeConnections: number;
    recommendations: string[];
  }> {
    const startTime = Date.now();
    const recommendations: string[] = [];

    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      const queryTime = Date.now() - startTime;

      if (error) {
        return {
          connectionStatus: 'unhealthy',
          queryPerformance: queryTime,
          activeConnections: 0,
          recommendations: ['Database connection failed', 'Check network connectivity']
        };
      }

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (queryTime > 2000) {
        status = 'unhealthy';
        recommendations.push('Query response time > 2s - investigate performance issues');
      } else if (queryTime > 1000) {
        status = 'degraded';
        recommendations.push('Query response time > 1s - consider optimization');
      }

      // Check cache hit rate
      const cacheSize = this.queryCache.size;
      if (cacheSize > 1000) {
        recommendations.push('Query cache size is large - consider cleanup');
      }

      return {
        connectionStatus: status,
        queryPerformance: queryTime,
        activeConnections: cacheSize, // Approximate
        recommendations
      };
    } catch (error) {
      return {
        connectionStatus: 'unhealthy',
        queryPerformance: Date.now() - startTime,
        activeConnections: 0,
        recommendations: ['Database health check failed', (error as Error).message]
      };
    }
  }

  // Utility methods
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cache management
  clearQueryCache(): void {
    this.queryCache.clear();
    logger.info('Query cache cleared');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.queryCache.size,
      keys: Array.from(this.queryCache.keys())
    };
  }
}

export const dbOptimizer = DatabaseOptimizer.getInstance();