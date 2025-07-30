
import React, { useState, useEffect } from 'react';
import DocumentUploadForm from './DocumentUploadForm';
import DocumentListTable from './DocumentListTable';
import UploadSuccessPrompt from './UploadSuccessPrompt';
import LocalExtractionToggle from '@/components/extraction/LocalExtractionToggle';
import EnhancedDocumentUpload from './EnhancedDocumentUpload';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useLocalExtraction } from '@/hooks/useLocalExtraction';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, History } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type DocumentExtraction = Tables<'document_extractions'>;

interface DocumentsTabContentProps {
  farmId: string;
}

const DocumentsTabContent = ({ farmId }: DocumentsTabContentProps) => {
  const { preferences } = useUserPreferences();
  const { 
    isReady, 
    confidenceThreshold, 
    setConfidenceThreshold 
  } = useLocalExtraction();
  
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    documentId: string;
    fileName: string;
    fileUrl: string;
    category: string;
  }>>([]);
  const [localExtractionEnabled, setLocalExtractionEnabled] = useState(true);

  const handleUploadSuccess = (files: Array<{ documentId: string; fileName: string; fileUrl: string; category: string }>) => {
    // Document list will automatically refresh via React Query invalidation
    console.log('Document upload successful - showing extraction prompt');
    setUploadedFiles(files);
  };

  const handleDismissUploadPrompt = () => {
    setUploadedFiles([]);
  };

  const handleProfileUpdated = () => {
    console.log('Farm profile updated from document extraction');
    // Could trigger additional UI updates here
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Local extraction settings */}
      <LocalExtractionToggle
        enabled={localExtractionEnabled}
        onEnabledChange={setLocalExtractionEnabled}
        confidenceThreshold={confidenceThreshold}
        onConfidenceThresholdChange={setConfidenceThreshold}
        isReady={isReady}
      />
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload & Extract
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Document History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Enhanced upload with extraction integration */}
          <EnhancedDocumentUpload
            farmId={farmId}
            onProfileUpdated={handleProfileUpdated}
          />
          
          {/* Legacy upload success prompt for backward compatibility */}
          {uploadedFiles.length > 0 && (
            <UploadSuccessPrompt
              farmId={farmId}
              uploadedFiles={uploadedFiles}
              onDismiss={handleDismissUploadPrompt}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Document list with extraction history */}
          <DocumentListTable farmId={farmId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentsTabContent;
