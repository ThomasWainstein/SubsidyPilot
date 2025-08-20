import { supabase } from '@/integrations/supabase/client';

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
   * Check API quota status before processing
   */
  async checkQuotaStatus(service: 'google_vision' | 'openai'): Promise<ApiQuotaStatus> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: usage, error } = await supabase
      .from('api_usage_tracking')
      .select('*')
      .eq('service', service)
      .eq('date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking quota:', error);
      throw new Error(`Failed to check ${service} quota`);
    }

    const currentUsage = usage || { requests_used: 0, cost_used: 0 };
    const limits = this.quotaLimits[service];
    
    return {
      service,
      requests_used: currentUsage.requests_used || 0,
      requests_limit: service === 'google_vision' ? limits.free_tier_daily : limits.rpm_limit,
      reset_time: service === 'google_vision' ? '00:00:00' : new Date(Date.now() + 60000).toISOString(),
      cost_used: currentUsage.cost_used || 0,
      cost_limit: service === 'google_vision' ? 1.50 : 15.00 // Daily cost limits
    };
  }

  /**
   * Record API usage and update quotas
   */
  async recordUsage(
    service: 'google_vision' | 'openai',
    requests: number,
    cost: number,
    success: boolean,
    processing_time_ms: number,
    client_type?: string
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Update daily usage
    await supabase
      .from('api_usage_tracking')
      .upsert({
        service,
        date: today,
        requests_used: requests,
        cost_used: cost,
        success_count: success ? 1 : 0,
        failure_count: success ? 0 : 1,
        total_processing_time_ms: processing_time_ms,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'service,date',
        ignoreDuplicates: false
      });

    // Record extraction metrics
    if (client_type) {
      await this.recordExtractionMetric(client_type, success, processing_time_ms, cost);
    }
  }

  /**
   * Check if processing should continue based on quotas
   */
  async canProcessRequest(service: 'google_vision' | 'openai'): Promise<{
    allowed: boolean;
    reason?: string;
    retry_after?: number;
  }> {
    try {
      const quota = await this.checkQuotaStatus(service);
      
      // Check request limits
      if (quota.requests_used >= quota.requests_limit) {
        return {
          allowed: false,
          reason: `${service} quota exceeded: ${quota.requests_used}/${quota.requests_limit}`,
          retry_after: service === 'google_vision' ? 86400 : 60 // seconds
        };
      }

      // Check cost limits
      if (quota.cost_used >= quota.cost_limit) {
        return {
          allowed: false,
          reason: `${service} cost limit exceeded: $${quota.cost_used.toFixed(2)}/$${quota.cost_limit.toFixed(2)}`,
          retry_after: 86400
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking quota:', error);
      return {
        allowed: false,
        reason: 'Quota check failed',
        retry_after: 300
      };
    }
  }

  /**
   * Record extraction metrics for accuracy tracking
   */
  private async recordExtractionMetric(
    client_type: string,
    success: boolean,
    processing_time_ms: number,
    cost: number
  ): Promise<void> {
    await supabase
      .from('extraction_metrics')
      .insert({
        client_type,
        success,
        processing_time_ms,
        cost,
        timestamp: new Date().toISOString()
      });
  }

  /**
   * Get comprehensive extraction metrics
   */
  async getExtractionMetrics(days: number = 7): Promise<ExtractionMetrics> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: metrics, error } = await supabase
      .from('extraction_metrics')
      .select('*')
      .gte('timestamp', since);

    if (error) {
      console.error('Error fetching metrics:', error);
      throw new Error('Failed to fetch extraction metrics');
    }

    const totalRequests = metrics?.length || 0;
    const successfulRequests = metrics?.filter(m => m.success).length || 0;
    const totalProcessingTime = metrics?.reduce((sum, m) => sum + (m.processing_time_ms || 0), 0) || 0;
    const totalCost = metrics?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    metrics?.filter(m => !m.success).forEach(m => {
      const errorType = m.error_type || 'unknown';
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    });

    // Client type accuracy
    const clientTypeAccuracy: Record<string, number> = {};
    const clientTypes = [...new Set(metrics?.map(m => m.client_type).filter(Boolean))];
    
    clientTypes.forEach(clientType => {
      const clientMetrics = metrics?.filter(m => m.client_type === clientType) || [];
      const clientSuccess = clientMetrics.filter(m => m.success).length;
      clientTypeAccuracy[clientType] = clientMetrics.length > 0 ? clientSuccess / clientMetrics.length : 0;
    });

    return {
      total_requests: totalRequests,
      success_rate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      average_processing_time: totalRequests > 0 ? totalProcessingTime / totalRequests : 0,
      average_cost: totalRequests > 0 ? totalCost / totalRequests : 0,
      error_breakdown: errorBreakdown,
      client_type_accuracy: clientTypeAccuracy
    };
  }

  /**
   * Alert on critical issues
   */
  async checkHealthAndAlert(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: ExtractionMetrics;
  }> {
    const metrics = await this.getExtractionMetrics(1); // Last 24 hours
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check success rate
    if (metrics.success_rate < 0.8) {
      status = 'critical';
      issues.push(`Low success rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
    } else if (metrics.success_rate < 0.9) {
      status = 'warning';
      issues.push(`Below target success rate: ${(metrics.success_rate * 100).toFixed(1)}%`);
    }

    // Check processing time
    if (metrics.average_processing_time > 8000) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Slow processing: ${(metrics.average_processing_time / 1000).toFixed(1)}s average`);
    }

    // Check cost trends
    if (metrics.average_cost > 0.08) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`High cost per extraction: $${metrics.average_cost.toFixed(3)}`);
    }

    // Check quota status
    const visionQuota = await this.checkQuotaStatus('google_vision');
    const openaiQuota = await this.checkQuotaStatus('openai');

    if (visionQuota.requests_used / visionQuota.requests_limit > 0.9) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`Google Vision quota at ${((visionQuota.requests_used / visionQuota.requests_limit) * 100).toFixed(1)}%`);
    }

    if (openaiQuota.cost_used / openaiQuota.cost_limit > 0.9) {
      status = status === 'critical' ? 'critical' : 'warning';
      issues.push(`OpenAI cost limit at ${((openaiQuota.cost_used / openaiQuota.cost_limit) * 100).toFixed(1)}%`);
    }

    return { status, issues, metrics };
  }
}

export const productionMonitor = ProductionMonitor.getInstance();