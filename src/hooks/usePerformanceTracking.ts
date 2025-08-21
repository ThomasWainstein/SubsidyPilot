import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface WebVitals {
  CLS: number;  // Cumulative Layout Shift
  FID: number;  // First Input Delay
  FCP: number;  // First Contentful Paint
  LCP: number;  // Largest Contentful Paint
  TTFB: number; // Time to First Byte
}

interface PerformanceData {
  webVitals: WebVitals;
  metrics: PerformanceMetric[];
  apiPerformance: {
    avgResponseTime: number;
    errorRate: number;
    requestsPerMinute: number;
  };
  resourceUsage: {
    memoryUsage: number;
    cpuUsage: number;
    storageUsed: number;
  };
  lastUpdated: Date;
}

export const usePerformanceTracking = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);

  const measureWebVitals = useCallback((): Promise<WebVitals> => {
    return new Promise((resolve) => {
      // Initialize with default values
      const vitals: WebVitals = {
        CLS: 0,
        FID: 0,
        FCP: 0,
        LCP: 0,
        TTFB: 0
      };

      // Measure TTFB using Navigation Timing API
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        vitals.TTFB = timing.responseStart - timing.requestStart;
      }

      // Measure FCP using Performance Observer (if available)
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.FCP = entry.startTime;
              }
            });
          });
          observer.observe({ entryTypes: ['paint'] });
        } catch (error) {
          console.warn('PerformanceObserver not fully supported', error);
        }
      }

      // For production, you would integrate with a real Web Vitals library
      // For now, we'll simulate some realistic values
      setTimeout(() => {
        vitals.CLS = Math.random() * 0.25; // Good CLS is < 0.1
        vitals.FID = Math.random() * 100; // Good FID is < 100ms
        vitals.FCP = vitals.FCP || (1000 + Math.random() * 2000); // 1-3s
        vitals.LCP = vitals.FCP + (500 + Math.random() * 1500); // FCP + 0.5-2s
        
        resolve(vitals);
      }, 100);
    });
  }, []);

  const measureApiPerformance = useCallback(async () => {
    const startTime = Date.now();
    let errorCount = 0;
    let successCount = 0;
    const totalRequests = 5;

    // Test multiple endpoints to get average performance
    const testEndpoints = [
      () => supabase.from('farms').select('count').limit(1),
      () => supabase.from('subsidies').select('count').limit(1),
      () => supabase.from('document_extractions').select('count').limit(1),
      () => supabase.auth.getSession(),
      () => supabase.storage.listBuckets()
    ];

    for (const endpoint of testEndpoints) {
      try {
        const testStart = Date.now();
        await endpoint();
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    const totalTime = Date.now() - startTime;
    const avgResponseTime = totalTime / totalRequests;
    const errorRate = (errorCount / totalRequests) * 100;

    return {
      avgResponseTime,
      errorRate,
      requestsPerMinute: Math.round((60000 / avgResponseTime) * 0.8) // Estimate with safety margin
    };
  }, []);

  const measureResourceUsage = useCallback((): Promise<any> => {
    return new Promise((resolve) => {
      // Use Performance API to estimate resource usage
      const memoryInfo = (performance as any).memory;
      
      const resourceUsage = {
        memoryUsage: memoryInfo ? Math.round((memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100) : 0,
        cpuUsage: Math.round(Math.random() * 30), // Simulated - would need real CPU monitoring
        storageUsed: 0 // Would be measured from actual storage APIs
      };

      // Estimate storage usage from localStorage and sessionStorage
      let localStorageSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length;
        }
      }
      resourceUsage.storageUsed = Math.round(localStorageSize / 1024); // KB

      resolve(resourceUsage);
    });
  }, []);

  const collectPerformanceData = useCallback(async () => {
    setLoading(true);
    
    try {
      const [webVitals, apiPerformance, resourceUsage] = await Promise.all([
        measureWebVitals(),
        measureApiPerformance(),
        measureResourceUsage()
      ]);

      const metrics: PerformanceMetric[] = [
        {
          name: 'First Contentful Paint',
          value: webVitals.FCP,
          unit: 'ms',
          timestamp: new Date(),
          threshold: { warning: 1800, critical: 3000 }
        },
        {
          name: 'Largest Contentful Paint',
          value: webVitals.LCP,
          unit: 'ms',
          timestamp: new Date(),
          threshold: { warning: 2500, critical: 4000 }
        },
        {
          name: 'Cumulative Layout Shift',
          value: webVitals.CLS,
          unit: '',
          timestamp: new Date(),
          threshold: { warning: 0.1, critical: 0.25 }
        },
        {
          name: 'First Input Delay',
          value: webVitals.FID,
          unit: 'ms',  
          timestamp: new Date(),
          threshold: { warning: 100, critical: 300 }
        },
        {
          name: 'API Response Time',
          value: apiPerformance.avgResponseTime,
          unit: 'ms',
          timestamp: new Date(),
          threshold: { warning: 1000, critical: 2000 }
        }
      ];

      // Check for performance alerts
      const newAlerts: string[] = [];
      metrics.forEach(metric => {
        if (metric.threshold) {
          if (metric.value > metric.threshold.critical) {
            newAlerts.push(`CRITICAL: ${metric.name} is ${metric.value}${metric.unit} (threshold: ${metric.threshold.critical}${metric.unit})`);
          } else if (metric.value > metric.threshold.warning) {
            newAlerts.push(`WARNING: ${metric.name} is ${metric.value}${metric.unit} (threshold: ${metric.threshold.warning}${metric.unit})`);
          }
        }
      });

      setAlerts(newAlerts);
      setPerformanceData({
        webVitals,
        metrics,
        apiPerformance,
        resourceUsage,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Error collecting performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [measureWebVitals, measureApiPerformance, measureResourceUsage]);

  const trackUserTiming = useCallback((name: string, startTime: number) => {
    const duration = Date.now() - startTime;
    
    // Log to performance timeline
    if (window.performance && window.performance.mark) {
      window.performance.mark(`${name}-end`);
      window.performance.measure(name, `${name}-start`, `${name}-end`);
    }

    // You could also send this to an analytics service
    console.log(`Performance: ${name} took ${duration}ms`);
    
    return duration;
  }, []);

  const startTiming = useCallback((name: string) => {
    const startTime = Date.now();
    
    if (window.performance && window.performance.mark) {
      window.performance.mark(`${name}-start`);
    }
    
    return startTime;
  }, []);

  useEffect(() => {
    collectPerformanceData();
    
    // Collect performance data every 60 seconds
    const interval = setInterval(collectPerformanceData, 60000);
    
    return () => clearInterval(interval);
  }, [collectPerformanceData]);

  return {
    performanceData,
    loading,
    alerts,
    collectPerformanceData,
    trackUserTiming,
    startTiming
  };
};