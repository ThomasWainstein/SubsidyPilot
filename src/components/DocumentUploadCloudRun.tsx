/**
 * Document Upload component with Cloud Run processing
 */
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, CheckCircle, XCircle, Cloud, Zap } from 'lucide-react';
import { useCloudRunProcessing } from '@/hooks/useCloudRunProcessing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentUploadCloudRunProps {
  onComplete?: (extractionData: any) => void;
  onError?: (error: string) => void;
  documentType?: string;
}

export const DocumentUploadCloudRun = ({
  onComplete,
  onError,
  documentType = 'general'
}: DocumentUploadCloudRunProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    processWithCloudRun,
    isProcessing,
    progress,
    result,
    error: processingError
  } = useCloudRunProcessing({
    onComplete: (result) => {
      console.log('✅ Processing completed:', result);
      onComplete?.(result.extractedData);
    },
    onError: (error) => {
      console.error('❌ Processing failed:', error);
      onError?.(error);
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);

    try {
      console.log('📤 Uploading file to Supabase storage...');
      
      // Upload to Supabase storage
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `documents/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('farm-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(filePath);

      // Create document record
      const { data: docData, error: docError } = await supabase.functions.invoke(
        'document-upload-handler',
        {
          body: {
            fileName: file.name,
            filePath: filePath,
            fileSize: file.size,
            fileType: file.type,
            documentType: documentType,
            userId: (await supabase.auth.getUser()).data.user?.id,
            category: 'test-documents'
          }
        }
      );

      if (docError || !docData?.success) {
        throw new Error(docError?.message || docData?.error || 'Failed to create document record');
      }

      console.log('✅ File uploaded successfully');
      setUploadedDocumentId(docData.documentId);
      setIsUploading(false);

      // Start Cloud Run processing
      toast.success('File uploaded! Starting processing...');
      await processWithCloudRun(
        docData.documentId,
        urlData.publicUrl,
        file.name,
        documentType
      );

    } catch (err) {
      console.error('❌ Upload failed:', err);
      setIsUploading(false);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  }, [documentType, processWithCloudRun, onComplete, onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff'],
      'text/plain': ['.txt'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isUploading || isProcessing
  });

  const getDocumentTypeDescription = () => {
    switch (documentType) {
      case 'subsidy_application':
        return 'Subsidy applications and funding forms (PDF, DOCX, up to 50MB)';
      case 'policy_document':
        return 'EU agricultural policy documents (PDF preferred, up to 50MB)';
      case 'financial':
        return 'Financial documents, invoices, receipts (PDF, XLSX, up to 50MB)';
      default:
        return 'General farm documents (PDF, DOCX, XLSX, images, up to 50MB)';
    }
  };

  const isComplete = result?.success && !processingError;
  const hasError = processingError || (!isProcessing && !result?.success);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Upload Document (Cloud Run Processing)</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            Advanced AI
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {getDocumentTypeDescription()}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!uploadedFile && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${(isUploading || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop your document here' : 'Upload document for processing'}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to select • PDF, DOCX, XLSX, Images
            </p>
          </div>
        )}

        {/* File Info */}
        {uploadedFile && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
            {hasError && <XCircle className="h-5 w-5 text-red-500" />}
          </div>
        )}

        {/* Progress */}
        {(isUploading || isProcessing || progress > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isUploading ? 'Uploading...' : 
                 isProcessing ? 'Processing with Cloud Run...' : 
                 'Complete'}
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={isUploading ? 30 : progress} className="h-2" />
          </div>
        )}

        {/* Results */}
        {result?.success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Document processed successfully! Extracted {Object.keys(result.extractedData || {}).length} data fields 
              in {result.processingTime}ms using {result.metadata?.model || 'Cloud Run AI'}.
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {hasError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {processingError || 'Processing failed. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          {uploadedFile && !isProcessing && !isComplete && (
            <Button
              onClick={() => {
                setUploadedFile(null);
                setUploadedDocumentId(null);
              }}
              variant="outline"
              size="sm"
            >
              Upload Different File
            </Button>
          )}
          
          {isComplete && (
            <Button
              onClick={() => {
                setUploadedFile(null);
                setUploadedDocumentId(null);
                setIsUploading(false);
              }}
              variant="outline"
              size="sm"
            >
              Process Another Document
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>✨ <strong>Cloud Run Processing:</strong> Advanced AI extraction with high accuracy</p>
          <p>⚡ <strong>Fast Processing:</strong> Typically completes in 30-120 seconds</p>
          <p>🔒 <strong>Secure:</strong> Files processed on Google Cloud infrastructure</p>
        </div>
      </CardContent>
    </Card>
  );
};