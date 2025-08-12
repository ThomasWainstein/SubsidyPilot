
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';
import ProductionReadinessCheck from '@/components/production/ProductionReadinessCheck';
import { UniversalHarvesterTest } from '@/components/scraper/UniversalHarvesterTest';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useAdmin } from '@/contexts/AdminContext';
import { prodLogger } from '@/utils/productionLogger';

const DashboardPage = () => {
  prodLogger.debug('DashboardPage: Rendering');
  const { trackUserAction } = usePerformanceMonitoring('Dashboard');
  const { isAdmin } = useAdmin();

  React.useEffect(() => {
    trackUserAction('dashboard_viewed');
  }, [trackUserAction]);
  
  return (
    <ErrorBoundary fallback={DashboardErrorFallback}>
      <div className="space-y-6">
        {isAdmin && <ProductionReadinessCheck />}
        {isAdmin && <UniversalHarvesterTest />}
        <DashboardContainer />
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;
