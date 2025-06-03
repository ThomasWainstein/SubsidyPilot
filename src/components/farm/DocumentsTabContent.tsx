
import React from 'react';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentList from './DocumentList';

interface DocumentsTabContentProps {
  farmId: string;
}

const DocumentsTabContent = ({ farmId }: DocumentsTabContentProps) => {
  const handleUploadSuccess = () => {
    // This will trigger a refetch of the documents list
    window.location.reload();
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
