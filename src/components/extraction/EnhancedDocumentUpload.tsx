import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useEnhancedExtraction } from '@/hooks/useEnhancedExtraction';
import DocumentProcessingStatus from './DocumentProcessingStatus';
import ExtractionReviewInterface from './ExtractionReviewInterface';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadedFile {
  file: File;
  preview: string;
  documentType: string;
}

const EnhancedDocumentUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewExtractionId, setReviewExtractionId] = useState<string>('');

  const {
    processDocument,
    retryWithBetterModel,
    isProcessing,
    currentStage,
    progress,
    result,
    error,
    hasResults,
    needsReview
  } = useEnhancedExtraction({
    onProgress: (progress, stage) => {
      console.log(`Processing progress: ${progress}% - ${stage}`);
    },
    onComplete: (result) => {
      console.log('Processing completed:', result);
    },
    onError: (error) => {
      console.error('Processing error:', error);
    },
    onNeedsReview: (extractionId) => {
      setReviewExtractionId(extractionId);
      setShowReview(true);
    }
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 5,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        documentType: 'unknown'
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    },
    disabled: isProcessing
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const updateDocumentType = (index: number, documentType: string) => {
    setUploadedFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], documentType };
      return newFiles;
    });
  };

  const processSelectedFile = async (uploadedFile: UploadedFile) => {
    try {
      setSelectedFile(uploadedFile);
      
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${uploadedFile.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadedFile.file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const documentId = crypto.randomUUID();
      
      // Start processing
      await processDocument(
        documentId,
        urlData.publicUrl,
        uploadedFile.file.name,
        uploadedFile.documentType !== 'unknown' ? uploadedFile.documentType : undefined
      );

    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process file');
    }
  };

  const handleRetryWithBetterModel = async () => {
    if (result?.extractionId) {
      try {
        await retryWithBetterModel(result.extractionId);
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  };

  const handleShowReview = () => {
    if (result?.extractionId) {
      setReviewExtractionId(result.extractionId);
      setShowReview(true);
    }
  };

  const handleDownloadResults = () => {
    if (result?.extractedFields) {
      const dataStr = JSON.stringify(result.extractedFields, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extraction_results_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReviewComplete = () => {
    setShowReview(false);
    setReviewExtractionId('');
    toast.success('Review completed successfully');
  };

  if (showReview && reviewExtractionId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => setShowReview(false)}
            className="flex items-center gap-2"
          >
            ← Back to Processing
          </Button>
        </div>
        <ExtractionReviewInterface
          extractionId={reviewExtractionId}
          onReviewComplete={handleReviewComplete}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Enhanced Document Processing</h1>
        <p className="text-muted-foreground mt-2">
          Upload business documents for AI-powered data extraction with manual review capabilities
        </p>
      </div>

      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            } ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-lg font-medium">
                  {isDragActive ? 'Drop files here' : 'Upload your documents'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 50MB each)
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="font-medium">Uploaded Files</h3>
              {uploadedFiles.map((uploadedFile, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{uploadedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={uploadedFile.documentType}
                      onValueChange={(value) => updateDocumentType(index, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown</SelectItem>
                        <SelectItem value="sirene">SIRENE</SelectItem>
                        <SelectItem value="invoice">Invoice</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="financial">Financial</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => processSelectedFile(uploadedFile)}
                      disabled={isProcessing || (selectedFile === uploadedFile && isProcessing)}
                      size="sm"
                    >
                      {selectedFile === uploadedFile && isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Process'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {(isProcessing || hasResults || error) && (
        <DocumentProcessingStatus
          isProcessing={isProcessing}
          currentStage={currentStage}
          progress={progress}
          result={result}
          error={error}
          onRetryWithBetterModel={handleRetryWithBetterModel}
          onShowReview={handleShowReview}
          onDownloadResults={handleDownloadResults}
        />
      )}

      {/* Help Information */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Document Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">SIRENE Documents</h4>
              <p className="text-muted-foreground">
                French business registration documents containing SIREN/SIRET numbers, legal forms, and company details.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Invoices</h4>
              <p className="text-muted-foreground">
                Commercial invoices with supplier/client details, amounts, and VAT information.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Certificates</h4>
              <p className="text-muted-foreground">
                Official certificates, attestations, and compliance documents.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Financial Statements</h4>
              <p className="text-muted-foreground">
                Balance sheets, income statements, and other financial documents.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedDocumentUpload;