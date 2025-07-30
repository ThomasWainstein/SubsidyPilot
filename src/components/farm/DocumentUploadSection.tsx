import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, 
  FileText, 
  Image, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Eye,
  Sparkles,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTempDocumentUpload } from '@/hooks/useTempDocumentUpload';
import FullExtractionReview from '@/components/review/FullExtractionReview';

interface DocumentUploadSectionProps {
  onExtractedDataChange: (allExtractedData: any[]) => void;
  onApplyAllData: (combinedData: any) => void;
  disabled?: boolean;
}

const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  onExtractedDataChange,
  onApplyAllData,
  disabled = false
}) => {
  const {
    documents,
    addDocument,
    processDocument,
    removeDocument,
    getExtractedData,
    getCompletedDocuments,
    isProcessing
  } = useTempDocumentUpload();
  
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Notify parent whenever extracted data changes
  useEffect(() => {
    const extractedData = getExtractedData();
    onExtractedDataChange(extractedData);
  }, [documents, onExtractedDataChange, getExtractedData]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    for (const file of acceptedFiles) {
      const documentId = addDocument(file);
      // Process each document immediately
      await processDocument(documentId);
    }
  }, [disabled, addDocument, processDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    disabled
  });

  const openReviewModal = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setReviewModalOpen(true);
  };

  const handleApplyAllExtractedData = () => {
    const allExtractedData = getExtractedData().reduce((combined, data) => {
      return { ...combined, ...data };
    }, {});

    if (Object.keys(allExtractedData).length === 0) {
      toast({
        title: 'No Data Available',
        description: 'No extracted data available to apply.',
        variant: 'destructive',
      });
      return;
    }

    onApplyAllData(allExtractedData);
    
    toast({
      title: 'Data Applied Successfully',
      description: `Applied extracted data from ${getCompletedDocuments().length} documents to the form.`,
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getStatusBadge = (document: any) => {
    if (document.extraction_status === 'completed') {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
    }
    if (document.extraction_status === 'processing' || document.classification_status === 'processing') {
      return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
    }
    if (document.extraction_status === 'failed' || document.classification_status === 'failed') {
      return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const completedExtractions = getCompletedDocuments();
  const hasExtractedData = completedExtractions.length > 0;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Farm Documents (Recommended)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload your farm registration, certificates, or other relevant documents to automatically extract and prefill your farm information.
          </p>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop your documents here...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">Drag & drop documents here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to select files
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports: PDF, DOCX, and image files (PNG, JPG, etc.)
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Uploaded Documents ({documents.length})</CardTitle>
              {hasExtractedData && (
                <Button
                  onClick={handleApplyAllExtractedData}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isProcessing}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply All Extracted Data
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(document.file_name)}
                    <span className="font-medium text-sm">{document.file_name}</span>
                    {getStatusBadge(document)}
                  </div>
                  <div className="flex items-center gap-2">
                    {document.extraction_status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReviewModal(document.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Review Data
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeDocument(document.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {document.upload_progress > 0 && document.upload_progress < 100 && (
                  <div className="mb-2">
                    <Progress value={document.upload_progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Processing... {document.upload_progress}%
                    </p>
                  </div>
                )}
                
                {document.predicted_category && (
                  <div className="text-xs text-muted-foreground">
                    Category: {document.predicted_category} 
                    {document.confidence && ` (${Math.round(document.confidence * 100)}% confidence)`}
                  </div>
                )}

                {document.extraction_data && (
                  <div className="mt-2 text-xs">
                    <p className="text-muted-foreground mb-1">Extracted Fields:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(document.extraction_data).slice(0, 4).map((key) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}
                        </Badge>
                      ))}
                      {Object.keys(document.extraction_data).length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{Object.keys(document.extraction_data).length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Extracted Data</DialogTitle>
          </DialogHeader>
          {selectedDocumentId && (() => {
            const selectedDocument = documents.find(d => d.id === selectedDocumentId);
            return selectedDocument && selectedDocument.extraction_data ? (
              <FullExtractionReview
                documentId={selectedDocument.id}
                extraction={{
                  id: selectedDocument.extraction_id,
                  extracted_data: selectedDocument.extraction_data,
                  farm_documents: {
                    file_name: selectedDocument.file_name,
                    file_url: selectedDocument.file_url
                  }
                }}
                farmId="new"
                onSave={(correctedData) => {
                  // Update the document with corrected data
                  const updatedDocs = documents.map(doc => 
                    doc.id === selectedDocumentId 
                      ? { ...doc, extraction_data: correctedData }
                      : doc
                  );
                  // Trigger re-evaluation of extracted data
                  const extractedData = updatedDocs
                    .filter(doc => doc.extraction_status === 'completed' && doc.extraction_data)
                    .map(doc => doc.extraction_data);
                  onExtractedDataChange(extractedData);
                  setReviewModalOpen(false);
                }}
                onApplyToForm={(mappedData) => {
                  onApplyAllData(mappedData);
                  setReviewModalOpen(false);
                }}
              />
            ) : null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentUploadSection;