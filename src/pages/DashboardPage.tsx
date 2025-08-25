
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import Navbar from '@/components/Navbar';
import { UniversalDashboard } from '@/components/dashboard/UniversalDashboard';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { prodLogger } from '@/utils/productionLogger';

const DashboardPage = () => {
  prodLogger.debug('DashboardPage: Rendering with Universal Dashboard');
  const { trackUserAction } = usePerformanceMonitoring('Dashboard');

  React.useEffect(() => {
    trackUserAction('universal_dashboard_viewed');
  }, [trackUserAction]);
  
  return (
    <ErrorBoundary fallback={DashboardErrorFallback}>
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <UniversalDashboard />
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;
