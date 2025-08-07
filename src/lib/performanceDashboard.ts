import { logger } from './logger';
import { monitoring } from './monitoring';

export interface PerformanceBenchmark {
  name: string;
  timestamp: number;
  metrics: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage?: number;
  };
  thresholds: {
    responseTime: { warning: number; critical: number };
    errorRate: { warning: number; critical: number };
    memoryUsage: { warning: number; critical: number };
  };
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold_exceeded' | 'anomaly_detected' | 'system_degradation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  currentValue: number;
  expectedValue?: number;
  threshold?: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  description: string;
  recommendations: string[];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'status';
  title: string;
  size: 'small' | 'medium' | 'large';
  refreshInterval: number;
  data: any;
  config: Record<string, any>;
}

class PerformanceDashboard {
  private static instance: PerformanceDashboard;
  private benchmarks: PerformanceBenchmark[] = [];
  private alerts: PerformanceAlert[] = [];
  private widgets: Map<string, DashboardWidget> = new Map();
  private metricsHistory: Map<string, Array<{ timestamp: number; value: number }>> = new Map();
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private performanceInterval?: NodeJS.Timeout;
  private anomalyInterval?: NodeJS.Timeout;
  private isDestroyed = false;

  static getInstance(): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard();
    }
    return PerformanceDashboard.instance;
  }

  constructor() {
    this.initializeDefaultWidgets();
    this.startPerformanceMonitoring();
    this.startAnomalyDetection();
  }

  // Performance benchmarking
  async runBenchmark(name: string, testFn: () => Promise<void>, iterations: number = 10): Promise<PerformanceBenchmark> {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();
    let errorCount = 0;

    logger.info(`Starting performance benchmark: ${name}`, { iterations });

    // Warmup
    try {
      await testFn();
    } catch (e) {
      // Ignore warmup errors
    }

    // Run benchmark
    const promises = Array(iterations).fill(null).map(async () => {
      try {
        await testFn();
      } catch (error) {
        errorCount++;
        throw error;
      }
    });

    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;
    const endMemory = this.getMemoryUsage();

    const benchmark: PerformanceBenchmark = {
      name,
      timestamp: Date.now(),
      metrics: {
        responseTime: duration / iterations,
        throughput: (iterations / duration) * 1000, // ops per second
        errorRate: (errorCount / iterations) * 100,
        memoryUsage: endMemory - startMemory
      },
      thresholds: {
        responseTime: { warning: 1000, critical: 3000 },
        errorRate: { warning: 5, critical: 15 },
        memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024 } // 50MB warning, 100MB critical
      },
      status: 'excellent'
    };

    // Determine status based on thresholds
    benchmark.status = this.calculateBenchmarkStatus(benchmark);

    this.benchmarks.push(benchmark);
    this.recordMetric('benchmark_response_time', benchmark.metrics.responseTime);
    this.recordMetric('benchmark_throughput', benchmark.metrics.throughput);
    this.recordMetric('benchmark_error_rate', benchmark.metrics.errorRate);

    // Check for alerts
    this.checkPerformanceAlerts(benchmark);

    logger.success(`Benchmark completed: ${name}`, {
      status: benchmark.status,
      responseTime: `${benchmark.metrics.responseTime.toFixed(2)}ms`,
      throughput: `${benchmark.metrics.throughput.toFixed(2)} ops/sec`,
      errorRate: `${benchmark.metrics.errorRate.toFixed(2)}%`
    });

    return benchmark;
  }

  private calculateBenchmarkStatus(benchmark: PerformanceBenchmark): PerformanceBenchmark['status'] {
    const { metrics, thresholds } = benchmark;

    if (
      metrics.responseTime >= thresholds.responseTime.critical ||
      metrics.errorRate >= thresholds.errorRate.critical ||
      metrics.memoryUsage >= thresholds.memoryUsage.critical
    ) {
      return 'critical';
    }

    if (
      metrics.responseTime >= thresholds.responseTime.warning ||
      metrics.errorRate >= thresholds.errorRate.warning ||
      metrics.memoryUsage >= thresholds.memoryUsage.warning
    ) {
      return 'warning';
    }

    if (metrics.responseTime < 500 && metrics.errorRate < 1) {
      return 'excellent';
    }

    return 'good';
  }

  // Alert system
  createAlert(
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    metric: string,
    currentValue: number,
    description: string,
    recommendations: string[] = [],
    threshold?: number
  ): PerformanceAlert {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      metric,
      currentValue,
      threshold,
      timestamp: Date.now(),
      resolved: false,
      description,
      recommendations
    };

    this.alerts.push(alert);

    // Notify callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        logger.error('Alert callback failed', error as Error);
      }
    });

    monitoring.captureError({
      message: `Performance alert: ${description}`,
      level: severity === 'critical' ? 'error' : 'warning',
      context: { alert }
    });

    logger.warn('Performance alert created', {
      type,
      severity,
      metric,
      currentValue,
      description
    });

    return alert;
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      logger.info('Alert resolved', { alertId, metric: alert.metric });
    }
  }

  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // Widget system
  addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
    logger.debug('Dashboard widget added', { id: widget.id, type: widget.type });
  }

  updateWidget(id: string, data: any): void {
    const widget = this.widgets.get(id);
    if (widget) {
      widget.data = { ...widget.data, ...data };
      logger.debug('Dashboard widget updated', { id });
    }
  }

  removeWidget(id: string): void {
    if (this.widgets.delete(id)) {
      logger.debug('Dashboard widget removed', { id });
    }
  }

  getWidget(id: string): DashboardWidget | undefined {
    return this.widgets.get(id);
  }

  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  // Metrics recording and history
  recordMetric(name: string, value: number): void {
    if (!this.metricsHistory.has(name)) {
      this.metricsHistory.set(name, []);
    }

    const history = this.metricsHistory.get(name)!;
    history.push({ timestamp: Date.now(), value });

    // Keep only last 1000 data points
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Update relevant widgets
    this.updateMetricWidgets(name, value);
  }

  getMetricHistory(name: string, duration?: number): Array<{ timestamp: number; value: number }> {
    const history = this.metricsHistory.get(name) || [];
    
    if (!duration) return history;

    const cutoff = Date.now() - duration;
    return history.filter(point => point.timestamp >= cutoff);
  }

  getMetricStats(name: string, duration?: number): {
    min: number;
    max: number;
    avg: number;
    current: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const history = this.getMetricHistory(name, duration);
    
    if (history.length === 0) {
      return { min: 0, max: 0, avg: 0, current: 0, trend: 'stable' };
    }

    const values = history.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const current = values[values.length - 1];

    // Calculate trend
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (history.length >= 2) {
      const recent = values.slice(-5); // Last 5 values
      const older = values.slice(-10, -5); // Previous 5 values
      
      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        
        const change = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (change > 5) trend = 'up';
        else if (change < -5) trend = 'down';
      }
    }

    return { min, max, avg, current, trend };
  }

  // Real-time monitoring
  private startPerformanceMonitoring(): void {
    if (this.isDestroyed) return;
    
    this.performanceInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.collectSystemMetrics();
    }, 5000); // Collect every 5 seconds
  }

  private collectSystemMetrics(): void {
    // Memory usage
    const memoryUsage = this.getMemoryUsage();
    this.recordMetric('memory_usage', memoryUsage);

    // Performance timing
    if ('performance' in window && 'navigation' in performance) {
      const navigation = performance.navigation as any;
      const timing = performance.timing;
      
      if (timing.loadEventEnd > 0) {
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        this.recordMetric('page_load_time', pageLoadTime);
      }
    }

    // Error rate (simulated)
    const errorRate = Math.random() * 5; // 0-5% error rate
    this.recordMetric('error_rate', errorRate);

    // Response time (simulated)
    const responseTime = 200 + Math.random() * 300; // 200-500ms
    this.recordMetric('response_time', responseTime);

    // Active users (simulated)
    const activeUsers = Math.floor(50 + Math.random() * 200); // 50-250 users
    this.recordMetric('active_users', activeUsers);
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  // Anomaly detection
  private startAnomalyDetection(): void {
    if (this.isDestroyed) return;
    
    this.anomalyInterval = setInterval(() => {
      if (this.isDestroyed) return;
      this.detectAnomalies();
    }, 30000); // Check every 30 seconds
  }

  private detectAnomalies(): void {
    const metricsToCheck = ['response_time', 'error_rate', 'memory_usage'];

    metricsToCheck.forEach(metric => {
      const history = this.getMetricHistory(metric, 10 * 60 * 1000); // Last 10 minutes
      if (history.length < 10) return; // Need at least 10 data points

      const values = history.map(point => point.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      const current = values[values.length - 1];
      const zScore = Math.abs((current - mean) / stdDev);

      // If current value is more than 2 standard deviations from mean, it's an anomaly
      if (zScore > 2) {
        this.createAlert(
          'anomaly_detected',
          zScore > 3 ? 'high' : 'medium',
          metric,
          current,
          `Anomaly detected in ${metric}: current value ${current.toFixed(2)} is ${zScore.toFixed(2)} standard deviations from the mean (${mean.toFixed(2)})`,
          [
            'Check system resources',
            'Review recent changes',
            'Monitor for continued anomalies'
          ]
        );
      }
    });
  }

  private checkPerformanceAlerts(benchmark: PerformanceBenchmark): void {
    const { metrics, thresholds } = benchmark;

    if (metrics.responseTime >= thresholds.responseTime.critical) {
      this.createAlert(
        'threshold_exceeded',
        'critical',
        'response_time',
        metrics.responseTime,
        `Response time critically high: ${metrics.responseTime.toFixed(2)}ms`,
        [
          'Check database query performance',
          'Review API endpoint optimization',
          'Consider scaling up resources'
        ],
        thresholds.responseTime.critical
      );
    } else if (metrics.responseTime >= thresholds.responseTime.warning) {
      this.createAlert(
        'threshold_exceeded',
        'medium',
        'response_time',
        metrics.responseTime,
        `Response time elevated: ${metrics.responseTime.toFixed(2)}ms`,
        [
          'Monitor database performance',
          'Check for expensive operations'
        ],
        thresholds.responseTime.warning
      );
    }

    if (metrics.errorRate >= thresholds.errorRate.critical) {
      this.createAlert(
        'threshold_exceeded',
        'critical',
        'error_rate',
        metrics.errorRate,
        `Error rate critically high: ${metrics.errorRate.toFixed(2)}%`,
        [
          'Check application logs',
          'Review recent deployments',
          'Investigate failing requests'
        ],
        thresholds.errorRate.critical
      );
    }
  }

  // Widget updates
  private updateMetricWidgets(metricName: string, value: number): void {
    this.widgets.forEach(widget => {
      if (widget.type === 'metric' && widget.config.metric === metricName) {
        this.updateWidget(widget.id, { value, timestamp: Date.now() });
      }
    });
  }

  private initializeDefaultWidgets(): void {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'response-time-metric',
        type: 'metric',
        title: 'Average Response Time',
        size: 'small',
        refreshInterval: 5000,
        data: { value: 0, unit: 'ms', trend: 'stable' },
        config: { metric: 'response_time', format: 'duration' }
      },
      {
        id: 'error-rate-metric',
        type: 'metric',
        title: 'Error Rate',
        size: 'small',
        refreshInterval: 5000,
        data: { value: 0, unit: '%', trend: 'stable' },
        config: { metric: 'error_rate', format: 'percentage' }
      },
      {
        id: 'memory-usage-chart',
        type: 'chart',
        title: 'Memory Usage Over Time',
        size: 'medium',
        refreshInterval: 10000,
        data: { chartType: 'line', data: [] },
        config: { metric: 'memory_usage', timeRange: '1h' }
      },
      {
        id: 'active-alerts',
        type: 'alert',
        title: 'Active Alerts',
        size: 'medium',
        refreshInterval: 10000,
        data: { alerts: [] },
        config: { showResolved: false, maxAlerts: 10 }
      }
    ];

    defaultWidgets.forEach(widget => this.addWidget(widget));
  }

  // Public API
  getDashboardData(): {
    widgets: DashboardWidget[];
    alerts: PerformanceAlert[];
    recentBenchmarks: PerformanceBenchmark[];
    systemStatus: 'healthy' | 'warning' | 'critical';
  } {
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    const recentBenchmarks = this.benchmarks.slice(-10);
    
    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      systemStatus = 'critical';
    } else if (activeAlerts.some(alert => alert.severity === 'high' || alert.severity === 'medium')) {
      systemStatus = 'warning';
    }

    return {
      widgets: this.getAllWidgets(),
      alerts: activeAlerts,
      recentBenchmarks,
      systemStatus
    };
  }

  exportMetrics(duration?: number): {
    metrics: Record<string, Array<{ timestamp: number; value: number }>>;
    benchmarks: PerformanceBenchmark[];
    alerts: PerformanceAlert[];
  } {
    const metrics: Record<string, Array<{ timestamp: number; value: number }>> = {};
    
    this.metricsHistory.forEach((history, name) => {
      metrics[name] = this.getMetricHistory(name, duration);
    });

    return {
      metrics,
      benchmarks: duration ? 
        this.benchmarks.filter(b => Date.now() - b.timestamp <= duration) : 
        this.benchmarks,
      alerts: duration ? 
        this.alerts.filter(a => Date.now() - a.timestamp <= duration) : 
        this.alerts
    };
  }

  // Cleanup method for proper resource management
  cleanup(): void {
    this.isDestroyed = true;
    
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = undefined;
    }
    
    if (this.anomalyInterval) {
      clearInterval(this.anomalyInterval);
      this.anomalyInterval = undefined;
    }
    
    // Clear callbacks and data
    this.alertCallbacks = [];
    this.widgets.clear();
    this.metricsHistory.clear();
    
    logger.info('Performance dashboard cleaned up');
  }
}

export const performanceDashboard = PerformanceDashboard.getInstance();
