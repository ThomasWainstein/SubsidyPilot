
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import GenericErrorFallback from './GenericErrorFallback';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
}

const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ children, pageName }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`Error in ${pageName || 'page'}:`, error, errorInfo);
  };

  return (
    <ErrorBoundary 
      fallback={({ error, resetError }) => (
        <GenericErrorFallback 
          error={error} 
          resetError={resetError}
          customMessage={`An error occurred while loading ${pageName || 'this page'}. Please try again.`}
        />
      )}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PageErrorBoundary;
