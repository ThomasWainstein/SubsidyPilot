
import React from 'react';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentList from './DocumentList';

interface DocumentsTabContentProps {
  farmId: string;
}

const DocumentsTabContent = ({ farmId }: DocumentsTabContentProps) => {
  return (
    <div className="space-y-6">
      <DocumentUploadForm farmId={farmId} />
      <DocumentList farmId={farmId} />
    </div>
  );
};

export default DocumentsTabContent;
