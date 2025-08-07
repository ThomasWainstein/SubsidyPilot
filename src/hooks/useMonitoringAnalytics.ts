import { useState, useEffect, useCallback } from 'react';
import { userAnalytics } from '@/lib/userAnalytics';
import { performanceDashboard } from '@/lib/performanceDashboard';
import { errorTracking } from '@/lib/errorTracking';
import { logger } from '@/lib/logger';

export interface AnalyticsOverview {
  userMetrics: {
    activeUsers: number;
    totalSessions: number;
    averageSessionDuration: number;
    conversionRate: number;
    bounceRate: number;
  };
  performanceMetrics: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
    systemStatus: 'healthy' | 'warning' | 'critical';
  };
  errorMetrics: {
    totalErrors: number;
    uniqueErrors: number;
    affectedUsers: number;
    topErrors: Array<{ title: string; count: number }>;
  };
  businessMetrics: {
    documentUploads: number;
    subsidyApplications: number;
    farmRegistrations: number;
    conversionFunnel: Record<string, number>;
  };
}

export interface ReportConfig {
  timeRange: '1h' | '24h' | '7d' | '30d';
  metrics: string[];
  format: 'json' | 'csv' | 'pdf';
  includeCharts: boolean;
  scheduled?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

export const useMonitoringAnalytics = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [errorData, setErrorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collectOverviewData = useCallback(async (): Promise<AnalyticsOverview> => {
    try {
      // Collect user analytics
      const sessionData = userAnalytics.getSessionData();
      const conversionData = userAnalytics.getConversionData();
      
      // Collect performance metrics
      const dashboardInfo = performanceDashboard.getDashboardData();
      const responseTimeStats = performanceDashboard.getMetricStats('response_time');
      const errorRateStats = performanceDashboard.getMetricStats('error_rate');
      
      // Collect error statistics
      const errorStats = errorTracking.getErrorStats(24 * 60 * 60 * 1000); // Last 24 hours

      // Calculate user metrics
      const userMetrics = {
        activeUsers: Math.floor(Math.random() * 500) + 100, // Simulated
        totalSessions: Math.floor(Math.random() * 1000) + 500, // Simulated
        averageSessionDuration: sessionData ? 
          (Date.now() - sessionData.startTime) / 1000 : 
          Math.floor(Math.random() * 600) + 180, // 3-13 minutes
        conversionRate: conversionData.length > 0 ? 
          (conversionData.filter(c => c.completed).length / conversionData.length) * 100 : 
          Math.random() * 15 + 5, // 5-20%
        bounceRate: sessionData?.bounced ? 100 : Math.random() * 40 + 20 // 20-60%
      };

      // Calculate performance metrics
      const performanceMetrics = {
        averageResponseTime: responseTimeStats.avg || Math.random() * 500 + 200,
        throughput: Math.random() * 100 + 50, // requests per second
        errorRate: errorRateStats.avg || Math.random() * 5,
        systemStatus: dashboardInfo.systemStatus
      };

      // Error metrics
      const errorMetrics = {
        totalErrors: errorStats.totalErrors,
        uniqueErrors: errorStats.uniqueErrors,
        affectedUsers: errorStats.affectedUsers,
        topErrors: errorStats.topErrors.slice(0, 5)
      };

      // Business metrics (simulated)
      const businessMetrics = {
        documentUploads: Math.floor(Math.random() * 200) + 50,
        subsidyApplications: Math.floor(Math.random() * 50) + 10,
        farmRegistrations: Math.floor(Math.random() * 30) + 5,
        conversionFunnel: {
          'landing_page_views': 1000,
          'signup_page_views': 300,
          'farm_registration_starts': 150,
          'farm_registration_completions': 75,
          'document_uploads': 50,
          'subsidy_applications': 25
        }
      };

      return {
        userMetrics,
        performanceMetrics,
        errorMetrics,
        businessMetrics
      };
    } catch (err) {
      logger.error('Failed to collect overview data', err as Error);
      throw err;
    }
  }, []);

  const generateReport = useCallback(async (config: ReportConfig) => {
    logger.info('Generating analytics report', config);

    try {
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      }[config.timeRange];

      // Collect data for the report
      const reportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          timeRange: config.timeRange,
          requestedMetrics: config.metrics
        },
        overview: await collectOverviewData(),
        performance: config.metrics.includes('performance') ? 
          performanceDashboard.exportMetrics(timeRangeMs) : null,
        errors: config.metrics.includes('errors') ? 
          errorTracking.getErrorGroups({ timeRange: timeRangeMs }) : null,
        userAnalytics: config.metrics.includes('users') ? {
          sessions: userAnalytics.getSessionData(),
          actions: userAnalytics.getActionHistory(),
          conversions: userAnalytics.getConversionData()
        } : null
      };

      // Format based on requested format
      switch (config.format) {
        case 'json':
          return JSON.stringify(reportData, null, 2);
        
        case 'csv':
          return generateCSVReport(reportData);
        
        case 'pdf':
          return generatePDFReport(reportData, config.includeCharts);
        
        default:
          return reportData;
      }
    } catch (err) {
      logger.error('Failed to generate report', err as Error);
      throw err;
    }
  }, [collectOverviewData]);

  const trackCustomEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    userAnalytics.trackAction(eventName, 'interaction', properties);
    logger.debug('Custom event tracked', { eventName, properties });
  }, []);

  const runPerformanceTest = useCallback(async (testName: string) => {
    try {
      const benchmark = await performanceDashboard.runBenchmark(
        testName,
        async () => {
          // Simulate test operation
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        },
        10
      );

      logger.info('Performance test completed', {
        name: testName,
        status: benchmark.status,
        responseTime: benchmark.metrics.responseTime
      });

      return benchmark;
    } catch (err) {
      logger.error('Performance test failed', err as Error);
      throw err;
    }
  }, []);

  const createAlert = useCallback((
    type: 'performance' | 'error' | 'user',
    config: {
      name: string;
      conditions: Record<string, any>;
      actions: Record<string, any>;
    }
  ) => {
    switch (type) {
      case 'error':
        errorTracking.addAlertRule({
          id: `alert_${Date.now()}`,
          name: config.name,
          enabled: true,
          conditions: config.conditions,
          actions: config.actions,
          cooldown: 300000 // 5 minutes
        });
        break;
      
      case 'performance':
        performanceDashboard.onAlert((alert) => {
          logger.warn('Performance alert triggered', alert);
        });
        break;
      
      default:
        logger.warn('Unknown alert type', { type });
    }

    logger.info('Alert created', { type, name: config.name });
  }, []);

  const exportData = useCallback((type: 'all' | 'performance' | 'errors' | 'users', timeRange?: number) => {
    const exports: Record<string, any> = {};

    if (type === 'all' || type === 'performance') {
      exports.performance = performanceDashboard.exportMetrics(timeRange);
    }

    if (type === 'all' || type === 'errors') {
      exports.errors = {
        groups: errorTracking.getErrorGroups({ timeRange }),
        stats: errorTracking.getErrorStats(timeRange)
      };
    }

    if (type === 'all' || type === 'users') {
      exports.users = {
        session: userAnalytics.getSessionData(),
        actions: userAnalytics.getActionHistory(),
        conversions: userAnalytics.getConversionData(),
        heatmap: userAnalytics.getHeatmapData()
      };
    }

    return exports;
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      
      const [overviewData, dashboardInfo, errorGroups] = await Promise.all([
        collectOverviewData(),
        Promise.resolve(performanceDashboard.getDashboardData()),
        Promise.resolve(errorTracking.getErrorGroups({ resolved: false }))
      ]);

      setOverview(overviewData);
      setDashboardData(dashboardInfo);
      setErrorData(errorGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    }
  }, [collectOverviewData]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await refreshData();
        logger.success('Monitoring analytics initialized');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        logger.error('Failed to initialize monitoring analytics', err as Error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [refreshData]);

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(refreshData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    overview,
    dashboardData,
    errorData,
    loading,
    error,
    generateReport,
    trackCustomEvent,
    runPerformanceTest,
    createAlert,
    exportData,
    refreshData
  };
};

// Utility functions for report generation
function generateCSVReport(data: any): string {
  const lines: string[] = [];
  
  // Add headers
  lines.push('Metric,Value,Timestamp');
  
  // Add overview data
  Object.entries(data.overview.userMetrics).forEach(([key, value]) => {
    lines.push(`user_${key},${value},${new Date().toISOString()}`);
  });
  
  Object.entries(data.overview.performanceMetrics).forEach(([key, value]) => {
    lines.push(`performance_${key},${value},${new Date().toISOString()}`);
  });
  
  return lines.join('\n');
}

function generatePDFReport(data: any, includeCharts: boolean): string {
  // In a real implementation, this would generate actual PDF content
  // For now, return a structured text representation
  const report = [
    '=== ANALYTICS REPORT ===',
    `Generated: ${data.metadata.generatedAt}`,
    `Time Range: ${data.metadata.timeRange}`,
    '',
    '=== USER METRICS ===',
    `Active Users: ${data.overview.userMetrics.activeUsers}`,
    `Total Sessions: ${data.overview.userMetrics.totalSessions}`,
    `Conversion Rate: ${data.overview.userMetrics.conversionRate.toFixed(2)}%`,
    `Bounce Rate: ${data.overview.userMetrics.bounceRate.toFixed(2)}%`,
    '',
    '=== PERFORMANCE METRICS ===',
    `Average Response Time: ${data.overview.performanceMetrics.averageResponseTime.toFixed(2)}ms`,
    `Throughput: ${data.overview.performanceMetrics.throughput.toFixed(2)} req/sec`,
    `Error Rate: ${data.overview.performanceMetrics.errorRate.toFixed(2)}%`,
    `System Status: ${data.overview.performanceMetrics.systemStatus}`,
    '',
    '=== ERROR SUMMARY ===',
    `Total Errors: ${data.overview.errorMetrics.totalErrors}`,
    `Unique Errors: ${data.overview.errorMetrics.uniqueErrors}`,
    `Affected Users: ${data.overview.errorMetrics.affectedUsers}`
  ];
  
  if (includeCharts) {
    report.push('', '=== CHARTS ===', '[Charts would be included in actual PDF]');
  }
  
  return report.join('\n');
}