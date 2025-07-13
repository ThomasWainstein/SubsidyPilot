
import React, { useState, useEffect } from 'react';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentListTable from './DocumentListTable';
import UploadSuccessPrompt from './UploadSuccessPrompt';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Tables } from '@/integrations/supabase/types';

type DocumentExtraction = Tables<'document_extractions'>;

interface DocumentsTabContentProps {
  farmId: string;
}

const DocumentsTabContent = ({ farmId }: DocumentsTabContentProps) => {
  const { preferences } = useUserPreferences();
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    documentId: string;
    fileName: string;
    fileUrl: string;
    category: string;
  }>>([]);

  const handleUploadSuccess = (files: Array<{ documentId: string; fileName: string; fileUrl: string; category: string }>) => {
    // Document list will automatically refresh via React Query invalidation
    // Show upload success prompt with extraction options
    console.log('Document upload successful - showing extraction prompt');
    setUploadedFiles(files);
  };

  const handleDismissUploadPrompt = () => {
    setUploadedFiles([]);
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
      
      {/* Enhanced document list table */}
      <div className="w-full">
        <DocumentListTable farmId={farmId} />
      </div>

      {/* Upload success prompt */}
      {uploadedFiles.length > 0 && (
        <UploadSuccessPrompt
          farmId={farmId}
          uploadedFiles={uploadedFiles}
          onDismiss={handleDismissUploadPrompt}
        />
      )}
    </div>
  );
};

export default DocumentsTabContent;
