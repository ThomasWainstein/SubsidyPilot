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
import { Upload, FileText, CheckCircle, XCircle, Cloud, Zap, Clock } from 'lucide-react';
import { useAsyncProcessing } from '@/hooks/useAsyncProcessing';
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
    createProcessingJob,
    job,
    isProcessing,
    result,
    error: processingError,
    progressPercentage,
    estimatedTimeRemaining,
    status
  } = useAsyncProcessing({
    onComplete: (result) => {
      console.log('✅ Processing completed:', result);
      onComplete?.(result);
      toast.success('Document processed successfully!');
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

      console.log('🚀 Creating async processing job...');
      toast.success('File uploaded! Processing started...');
      
      // Step 3: Create async processing job
      await createProcessingJob(
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
  }, [documentType, createProcessingJob, onComplete, onError]);

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

  const isComplete = result && !processingError;
  const hasError = processingError || (status === 'failed');

  const getCurrentProgress = () => {
    if (isUploading) return 25;
    if (status === 'queued') return 35;
    if (status === 'processing') return 75;
    if (status === 'completed') return 100;
    return progressPercentage || 0;
  };

  const getStatusText = () => {
    if (isUploading) return 'Uploading file...';
    if (status === 'queued') return 'Queued for processing...';
    if (status === 'processing') return 'Processing with Cloud Run...';
    if (status === 'completed') return 'Processing complete!';
    if (status === 'failed') return 'Processing failed';
    return 'Ready';
  };

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
            {isProcessing && <Clock className="h-5 w-5 text-blue-500 animate-spin" />}
          </div>
        )}

        {/* Job Status */}
        {job && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700">
                Job ID: {job.job_id}
              </span>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {status}
              </Badge>
            </div>
            {estimatedTimeRemaining && (
              <p className="text-xs text-blue-600">
                Estimated time remaining: {Math.ceil(estimatedTimeRemaining / 60)} minutes
              </p>
            )}
          </div>
        )}

        {/* Progress */}
        {(isUploading || isProcessing || getCurrentProgress() > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {getStatusText()}
              </span>
              <span className="font-medium">{getCurrentProgress()}%</span>
            </div>
            <Progress value={getCurrentProgress()} className="h-2" />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-success">✅ Processing Complete</h3>
                <Badge variant="secondary">
                  {result.processing_time_ms ? `${result.processing_time_ms}ms` : 'N/A'}
                </Badge>
              </div>

              {/* Hybrid Processing Metrics */}
              {result.extraction_method && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-background/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Processing Method</div>
                    <div className="font-semibold capitalize">
                      {result.extraction_method.replace('-', ' + ')}
                    </div>
                  </div>
                  
                  {result.cost_optimization && (
                    <>
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">Pattern Fields</div>
                        <div className="font-semibold text-primary">
                          {result.cost_optimization.fields_from_patterns || 0}
                        </div>
                      </div>
                      
                      <div className="text-center p-3 bg-background/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">AI Fields</div>
                        <div className="font-semibold text-secondary">
                          {result.cost_optimization.fields_from_ai || 0}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Processing Time Breakdown */}
              {result.pattern_extraction_time && (
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Pattern Extraction:</span>
                  <span className="font-mono">{result.pattern_extraction_time}ms</span>
                </div>
              )}
              
              {result.ai_processing_time && result.ai_processing_time > 0 && (
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">AI Processing:</span>
                  <span className="font-mono">{result.ai_processing_time}ms</span>
                </div>
              )}

              {/* Cost Optimization Note */}
              {result.extraction_method === 'pattern-only' && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg mb-2">
                  <span className="text-lg">⚡</span>
                  <div className="text-sm">
                    <div className="font-semibold text-primary">Cost Optimized!</div>
                    <div className="text-muted-foreground">Pattern extraction only - no AI costs</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Confidence Score:</span>
                <span className="font-mono">{(result.confidence * 100).toFixed(1)}%</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fields Extracted:</span>
                <span className="font-mono">{result.fields_extracted || 0}/{result.total_fields || 0}</span>
              </div>
            </div>

            {/* Extracted Data */}
            {result.extractedData && Object.keys(result.extractedData).length > 0 && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-3">Extracted Data:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(result.extractedData).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-mono text-right max-w-xs truncate">
                        {String(value) || 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
          <p>🔍 <strong>Hybrid Processing:</strong> Fast pattern extraction + AI when needed</p>
          <p>⚡ <strong>Cost Optimized:</strong> Uses AI only for complex fields</p>
          <p>📊 <strong>Smart Analysis:</strong> Combines rule-based and ML approaches</p>
          <p>🔒 <strong>Secure:</strong> Files processed on Google Cloud infrastructure</p>
        </div>
      </CardContent>
    </Card>
  );
};