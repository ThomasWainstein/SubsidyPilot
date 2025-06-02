
import React from 'react';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentList from './DocumentList';
import ErrorBoundary from '@/components/ErrorBoundary';

interface DocumentsTabContentProps {
  farmId: string;
}

const DocumentErrorFallback = ({ error, resetError }: { error?: Error; resetError: () => void }) => (
  <div className="text-center py-8">
    <p className="text-red-600 dark:text-red-400 mb-4">
      Error loading documents: {error?.message || 'Unknown error'}
    </p>
    <button 
      onClick={resetError}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Try Again
    </button>
  </div>
);

const DocumentsTabContent = ({ farmId }: DocumentsTabContentProps) => {
  return (
    <div className="space-y-6">
      <ErrorBoundary fallback={DocumentErrorFallback}>
        <DocumentUploadForm farmId={farmId} />
      </ErrorBoundary>
      
      <ErrorBoundary fallback={DocumentErrorFallback}>
        <DocumentList farmId={farmId} />
      </ErrorBoundary>
    </div>
  );
};

export default DocumentsTabContent;
