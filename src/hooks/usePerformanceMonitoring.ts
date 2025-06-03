
import { useEffect } from 'react';

interface PerformanceMetrics {
  pageName: string;
  loadTime?: number;
  renderTime?: number;
}

export const usePerformanceMonitoring = (pageName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    // Measure page load time
    const measurePageLoad = () => {
      const loadTime = performance.now() - startTime;
      console.log(`Page Load: ${pageName} - ${loadTime.toFixed(2)}ms`);
      
      // In production, this would send to analytics service
      if (loadTime > 2000) {
        console.warn(`Slow page load detected: ${pageName} took ${loadTime.toFixed(2)}ms`);
      }
    };

    // Measure when page is fully loaded
    if (document.readyState === 'complete') {
      measurePageLoad();
    } else {
      window.addEventListener('load', measurePageLoad);
      return () => window.removeEventListener('load', measurePageLoad);
    }
  }, [pageName]);

  const trackUserAction = (action: string, metadata?: Record<string, any>) => {
    console.log(`User Action: ${action}`, metadata);
    // In production, this would send to analytics service
  };

  return { trackUserAction };
};
