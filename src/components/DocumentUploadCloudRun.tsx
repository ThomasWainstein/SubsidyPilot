/**
 * Document Upload component with Streaming Cloud Run processing
 * Phase 3: Multi-Stage Pipeline with Real-time Progress
 */
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, CheckCircle, XCircle, Waves, Zap } from 'lucide-react';
import { useStreamingProcessing } from '@/hooks/useStreamingProcessing';
import { StreamingProgressDisplay } from '@/components/StreamingProgressDisplay';
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
    createStreamingJob,
    stages,
    overallProgress,
    currentStage,
    partialResults,
    isComplete,
    error: processingError,
    totalProcessingTime,
    estimatedTimeRemaining,
    isProcessing,
    reset
  } = useStreamingProcessing({
    onStageComplete: (stage) => {
      console.log(`✅ Stage completed: ${stage.name}`);
      toast.success(`${stage.name} completed!`, { duration: 2000 });
    },
    onPartialResults: (results, stageId) => {
      console.log(`📊 Partial results from ${stageId}:`, results);
      const fieldsCount = Object.keys(results || {}).length;
      if (fieldsCount > 0) {
        toast.info(`${fieldsCount} fields extracted`, { duration: 1500 });
      }
    },
    onComplete: (result) => {
      console.log('✅ All processing completed:', result);
      onComplete?.(result);
      toast.success('Document processing complete!');
    },
    onError: (error) => {
      console.error('❌ Processing failed:', error);
      onError?.(error);
      toast.error(`Processing failed: ${error}`);
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploading(true);

    try {
      console.log('📤 Starting upload process...');
      
      // Step 1: Get upload URL and create document record
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'document-upload-handler',
        {
          body: {
            fileName: file.name,
            fileSize: file.size,
            documentType: documentType,
            userId: (await supabase.auth.getUser()).data.user?.id,
            clientType: 'individual',
            useCase: 'client-onboarding',
            category: 'other'
          }
        }
      );

      if (uploadError || !uploadData?.success) {
        throw new Error(uploadError?.message || uploadData?.error || 'Failed to create upload URL');
      }

      console.log('✅ Upload URL created, uploading file...');

      // Step 2: Upload file to the signed URL
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      console.log('✅ File uploaded successfully');
      setUploadedDocumentId(uploadData.documentId);
      setIsUploading(false);

      // Step 3: Get the public URL for processing
      const { data: urlData } = supabase.storage
        .from('farm-documents')
        .getPublicUrl(uploadData.filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get file URL for processing');
      }

      console.log('🚀 Creating streaming processing job...');
      toast.success('File uploaded! Streaming processing started...');
      
      // Step 3: Create streaming processing job
      await createStreamingJob(
        uploadData.documentId,
        urlData.publicUrl,
        file.name,
        'individual',
        documentType,
        'medium'
      );

    } catch (err) {
      console.error('❌ Upload failed:', err);
      setIsUploading(false);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      toast.error(errorMessage);
      onError?.(errorMessage);
    }
  }, [documentType, createStreamingJob, onComplete, onError]);

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

  const hasError = processingError;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Streaming Document Processing</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            Phase 3: Real-time
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
              {isDragActive ? 'Drop your document here' : 'Upload document for streaming processing'}
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
            {isProcessing && <Waves className="h-5 w-5 text-blue-500 animate-pulse" />}
          </div>
        )}

        {/* Streaming Progress Display */}
        {(isProcessing || isComplete || hasError) && stages.length > 0 && (
          <StreamingProgressDisplay
            stages={stages}
            overallProgress={overallProgress}
            currentStage={currentStage}
            partialResults={partialResults}
            isComplete={isComplete}
            error={processingError}
            totalProcessingTime={totalProcessingTime}
            estimatedTimeRemaining={estimatedTimeRemaining}
          />
        )}

        {/* Error Alert */}
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
                reset();
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
                reset();
              }}
              variant="outline"
              size="sm"
            >
              Process Another Document
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>🌊 <strong>Streaming Pipeline:</strong> Real-time progress with stage-by-stage updates</p>
          <p>⚡ <strong>Progressive Results:</strong> See extracted data as it becomes available</p>
          <p>📊 <strong>Transparent Processing:</strong> Full visibility into each processing stage</p>
          <p>🔒 <strong>Secure:</strong> Files processed on Google Cloud infrastructure</p>
        </div>
      </CardContent>
    </Card>
  );
};