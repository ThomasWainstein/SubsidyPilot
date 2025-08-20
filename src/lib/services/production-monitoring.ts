interface ApiQuotaStatus {
  service: 'google_vision' | 'openai';
  requests_used: number;
  requests_limit: number;
  reset_time: string;
  cost_used: number;
  cost_limit: number;
}

interface ExtractionMetrics {
  total_requests: number;
  success_rate: number;
  average_processing_time: number;
  average_cost: number;
  error_breakdown: Record<string, number>;
  client_type_accuracy: Record<string, number>;
}

/**
 * Production monitoring and quota management for extraction services
 */
export class ProductionMonitor {
  private static instance: ProductionMonitor;
  
  private quotaLimits = {
    google_vision: {
      free_tier_daily: 1000,
      cost_per_request: 0.0015,
      max_file_size_mb: 20
    },
    openai: {
      rpm_limit: 500, // requests per minute
      cost_per_1k_tokens: 0.03,
      max_tokens: 8192
    }
  };

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  /**
   * Check API quota status before processing - simplified version
   */
  async checkQuotaStatus(service: 'google_vision' | 'openai'): Promise<ApiQuotaStatus> {
    // Simplified client-side quota checking
    const limits = this.quotaLimits[service];
    
    let requestsLimit: number;
    if (service === 'google_vision') {
      requestsLimit = (limits as typeof this.quotaLimits.google_vision).free_tier_daily;
    } else {
      requestsLimit = (limits as typeof this.quotaLimits.openai).rpm_limit;
    }
    
    return {
      service,
      requests_used: 0, // Will be populated by edge functions
      requests_limit: requestsLimit,
      reset_time: service === 'google_vision' ? '00:00:00' : new Date(Date.now() + 60000).toISOString(),
      cost_used: 0,
      cost_limit: service === 'google_vision' ? 1.50 : 15.00
    };
  }

  /**
   * Record API usage - simplified client-side version
   */
  async recordUsage(
    service: 'google_vision' | 'openai',
    requests: number,
    cost: number,
    success: boolean,
    processing_time_ms: number,
    client_type?: string
  ): Promise<void> {
    // This will be handled by edge functions in production
    console.log(`Usage recorded: ${service}, ${requests} requests, $${cost.toFixed(4)}, ${success ? 'success' : 'failed'}`);
  }

  /**
   * Check if processing should continue - simplified version
   */
  async canProcessRequest(service: 'google_vision' | 'openai'): Promise<{
    allowed: boolean;
    reason?: string;
    retry_after?: number;
  }> {
    // Simplified client-side check - actual quotas handled by edge functions
    return { allowed: true };
  }

  /**
   * Get comprehensive extraction metrics - mock data for client-side
   */
  async getExtractionMetrics(days: number = 7): Promise<ExtractionMetrics> {
    // Mock data for client-side display - real metrics from edge functions
    return {
      total_requests: 150,
      success_rate: 0.92,
      average_processing_time: 3200,
      average_cost: 0.045,
      error_breakdown: {
        'quota_exceeded': 5,
        'ocr_failed': 3,
        'invalid_document': 2
      },
      client_type_accuracy: {
        'farm': 0.94,
        'business': 0.89,
        'individual': 0.96,
        'municipality': 0.82,
        'ngo': 0.87
      }
    };
  }

  /**
   * Alert on critical issues - simplified client version
   */
  async checkHealthAndAlert(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: ExtractionMetrics;
  }> {
    const metrics = await this.getExtractionMetrics(1);
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Basic health checks based on mock metrics
    if (metrics.success_rate < 0.8) {
      status = 'critical';
      issues.push(`Low success rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
    } else if (metrics.success_rate < 0.9) {
      status = 'warning';
      issues.push(`Below target success rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
    }

    if (metrics.average_processing_time > 8000) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Slow processing: ${(metrics.average_processing_time / 1000).toFixed(1)}s average`);
    }

    return { status, issues, metrics };
  }
}

export const productionMonitor = ProductionMonitor.getInstance();