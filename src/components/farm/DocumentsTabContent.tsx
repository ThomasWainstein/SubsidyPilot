
import React, { useState, useEffect } from 'react';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentList from './DocumentList';
import PrefillPromptDialog from './PrefillPromptDialog';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Tables } from '@/integrations/supabase/types';

type DocumentExtraction = Tables<'document_extractions'>;

interface DocumentsTabContentProps {
  farmId: string;
}

const DocumentsTabContent = ({ farmId }: DocumentsTabContentProps) => {
  const { preferences } = useUserPreferences();
  const [promptData, setPromptData] = useState<{
    fileName: string;
    extraction: DocumentExtraction;
  } | null>(null);

  const handleUploadSuccess = () => {
    // Document list will automatically refresh via React Query invalidation
    // Stay on Documents tab - no redirects or page reloads
    console.log('Document upload successful - staying on Documents tab');
  };

  const handleExtractionCompleted = (fileName: string, extraction: DocumentExtraction) => {
    // Only show prompt if user hasn't suppressed it
    if (!preferences.suppressPrefillPrompt) {
      setPromptData({ fileName, extraction });
    }
  };

  const handleClosePrompt = () => {
    setPromptData(null);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-first responsive upload form */}
      <div className="w-full">
        <DocumentUploadForm 
          farmId={farmId} 
          onUploadSuccess={handleUploadSuccess}
          onExtractionCompleted={handleExtractionCompleted}
        />
      </div>
      
      {/* Mobile-first responsive document list */}
      <div className="w-full">
        <DocumentList farmId={farmId} />
      </div>

      {/* Prefill prompt dialog */}
      {promptData && (
        <PrefillPromptDialog
          isOpen={true}
          onClose={handleClosePrompt}
          farmId={farmId}
          fileName={promptData.fileName}
          extraction={promptData.extraction}
        />
      )}
    </div>
  );
};

export default DocumentsTabContent;
