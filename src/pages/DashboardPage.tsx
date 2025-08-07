
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';
import ProductionReadinessCheck from '@/components/production/ProductionReadinessCheck';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { getIsAdmin } from '@/config/environment';
import { useAuth } from '@/contexts/AuthContext';
import { prodLogger } from '@/utils/productionLogger';

const DashboardPage = () => {
  prodLogger.debug('DashboardPage: Rendering');
  const { trackUserAction } = usePerformanceMonitoring('Dashboard');
  const { user } = useAuth();
  const isAdmin = getIsAdmin(user);

  React.useEffect(() => {
    trackUserAction('dashboard_viewed');
  }, [trackUserAction]);
  
  return (
    <ErrorBoundary fallback={DashboardErrorFallback}>
      <div className="space-y-6">
        {isAdmin && <ProductionReadinessCheck />}
        <DashboardContainer />
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;
