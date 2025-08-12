
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { prodLogger } from '@/utils/productionLogger';

const DashboardPage = () => {
  prodLogger.debug('DashboardPage: Rendering');
  const { trackUserAction } = usePerformanceMonitoring('Dashboard');

  React.useEffect(() => {
    trackUserAction('dashboard_viewed');
  }, [trackUserAction]);
  
  return (
    <ErrorBoundary fallback={DashboardErrorFallback}>
      <DashboardContainer />
    </ErrorBoundary>
  );
};

export default DashboardPage;
