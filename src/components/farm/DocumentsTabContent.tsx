
import React from 'react';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentList from './DocumentList';

interface DocumentsTabContentProps {
  farmId: string;
}

const DocumentsTabContent = ({ farmId }: DocumentsTabContentProps) => {
  const handleUploadSuccess = () => {
    // Document list will automatically refresh via React Query invalidation
    // No need to reload the page - this was causing the redirect issue
    console.log('Document upload successful - list will refresh automatically');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-first responsive upload form */}
      <div className="w-full">
        <DocumentUploadForm 
          farmId={farmId} 
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
      
      {/* Mobile-first responsive document list */}
      <div className="w-full">
        <DocumentList farmId={farmId} />
      </div>
    </div>
  );
};

export default DocumentsTabContent;
