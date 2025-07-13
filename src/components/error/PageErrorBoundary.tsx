
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
    
    // Check for Select.Item specific errors and provide better debugging
    if (error.message.includes('Select.Item') && error.message.includes('empty string')) {
      console.error('Select.Item empty value error detected!');
      console.error('This error is caused by a SelectItem component receiving an empty string value.');
      console.error('Check all Select components for empty values in their options.');
      
      // Try to identify the problematic component from the stack
      if (errorInfo.componentStack) {
        console.error('Component stack:', errorInfo.componentStack);
      }
    }
  };

  return (
    <ErrorBoundary 
      fallback={({ error, resetError }) => (
        <GenericErrorFallback 
          error={error} 
          resetError={resetError}
          customMessage={
            error?.message?.includes('Select.Item') 
              ? `A form component error occurred${pageName ? ` on ${pageName}` : ''}. This usually happens when document import fails to fill all required fields. Please try manually selecting values or contact support.`
              : `An error occurred while loading ${pageName || 'this page'}. Please try again.`
          }
        />
      )}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PageErrorBoundary;
