
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';

const DashboardPage = () => {
  console.log('DashboardPage: Rendering');
  
  return (
    <ErrorBoundary fallback={DashboardErrorFallback}>
      <DashboardContainer />
    </ErrorBoundary>
  );
};

export default DashboardPage;
