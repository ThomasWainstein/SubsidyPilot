import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Trash2,
  Clock,
  Loader2,
  StopCircle,
  AlertCircle,
  FileX
} from 'lucide-react';
import { TempDocument } from '@/hooks/useTempDocumentUpload';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { validate as uuidValidate } from 'uuid';

interface DocumentUploadStatusProps {
  document: TempDocument;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
  onCancel?: (id: string) => void;
  className?: string;
}

const DocumentUploadStatus: React.FC<DocumentUploadStatusProps> = ({
  document,
  onRetry,
  onRemove,
  onCancel,
  className
}) => {
  const { toast } = useToast();
  const handleRetry = (id: string) => {
    if (!uuidValidate(id)) {
      toast({
        title: 'Document upload not complete',
        description: 'Please wait and try again.',
        variant: 'destructive',
      });
      return;
    }
    onRetry(id);
  };
  const getStatusIcon = () => {
    if (document.validation_errors?.length) {
      return <FileX className="h-4 w-4 text-orange-500" />;
    }
    
    if (document.upload_status === 'uploading') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (document.upload_status === 'cancelled') {
      return <StopCircle className="h-4 w-4 text-gray-500" />;
    }
    
    if (document.classification_status === 'processing' || document.extraction_status === 'processing') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    if (document.extraction_status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    if (document.upload_status === 'failed' || 
        document.classification_status === 'failed' || 
        document.extraction_status === 'failed') {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (document.validation_errors?.length) {
      return `File validation failed: ${document.validation_errors.join(', ')}`;
    }
    
    if (document.upload_status === 'uploading') {
      return `Uploading... ${document.upload_progress}%`;
    }
    
    if (document.upload_status === 'cancelled') {
      return 'Upload cancelled';
    }
    
    if (document.classification_status === 'processing') {
      return 'Classifying document...';
    }
    
    if (document.extraction_status === 'processing') {
      return 'Extracting data...';
    }
    
    if (document.extraction_status === 'completed') {
      return 'Processing complete';
    }
    
    if (document.error_message) {
      return document.error_message;
    }
    
    return 'Waiting to process...';
  };

  const getStatusBadge = () => {
    if (document.validation_errors?.length) {
      return <Badge variant="destructive">Invalid</Badge>;
    }
    
    if (document.upload_status === 'uploading') {
      return <Badge variant="secondary">Uploading</Badge>;
    }
    
    if (document.upload_status === 'cancelled') {
      return <Badge variant="outline">Cancelled</Badge>;
    }
    
    if (document.classification_status === 'processing') {
      return <Badge variant="secondary">Classifying</Badge>;
    }
    
    if (document.extraction_status === 'processing') {
      return <Badge variant="secondary">Extracting</Badge>;
    }
    
    if (document.extraction_status === 'completed') {
      return <Badge variant="default">Ready</Badge>;
    }
    
    if (document.upload_status === 'failed' || 
        document.classification_status === 'failed' || 
        document.extraction_status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    
    return <Badge variant="outline">Pending</Badge>;
  };

  const isProcessing = document.upload_status === 'uploading' ||
                     document.classification_status === 'processing' ||
                     document.extraction_status === 'processing';
  
  const hasError = document.upload_status === 'failed' ||
                   document.classification_status === 'failed' ||
                   document.extraction_status === 'failed';

  const hasValidationError = Boolean(document.validation_errors?.length);
  const canRetry = (hasError || hasValidationError) && 
                   (document.retry_count || 0) < 3 && 
                   document.can_retry !== false;
  const canCancel = document.upload_status === 'uploading' && onCancel;
  const isCancelled = document.upload_status === 'cancelled';

  return (
    <Card className={cn("border-l-4", 
      hasValidationError ? "border-l-orange-500" :
      hasError ? "border-l-red-500" : 
      isCancelled ? "border-l-gray-500" :
      document.extraction_status === 'completed' ? "border-l-green-500" :
      isProcessing ? "border-l-blue-500" : "border-l-gray-300",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" title={document.file_name}>
                {document.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(document.file_size / 1024 / 1024).toFixed(1)} MB • {document.file_type}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge()}
                {document.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round(document.confidence * 100)}% confident
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            {canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel!(document.id)}
                className="h-6 w-6 p-0"
                title="Cancel upload"
              >
                <StopCircle className="h-3 w-3" />
              </Button>
            )}
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRetry(document.id)}
                className="h-6 w-6 p-0"
                title={`Retry processing (${document.retry_count || 0}/3)`}
                disabled={isProcessing || !uuidValidate(document.id)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemove(document.id)}
              className="h-6 w-6 p-0"
              title="Remove document"
              disabled={isProcessing}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* Progress bar for upload */}
        {document.upload_status === 'uploading' && (
          <div className="mb-2">
            <Progress value={document.upload_progress} className="h-2" />
          </div>
        )}
        
        {/* Status text */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{getStatusText()}</span>
          <div className="flex items-center space-x-2">
            {document.retry_count && document.retry_count > 0 && (
              <span>Retry {document.retry_count}/3</span>
            )}
            {document.upload_status === 'uploading' && (
              <span className="text-blue-600 font-medium">
                {document.upload_progress}%
              </span>
            )}
          </div>
        </div>
        
        {/* Validation errors */}
        {hasValidationError && document.validation_errors && (
          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
            <div className="flex items-start space-x-1">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">File validation failed:</p>
                <ul className="list-disc list-inside mt-1">
                  {document.validation_errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {hasError && document.error_message && !hasValidationError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            <div className="flex items-start space-x-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span>{document.error_message}</span>
            </div>
          </div>
        )}
        
        {/* Extraction preview for completed documents */}
        {document.extraction_status === 'completed' && document.extraction_data && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <p className="text-green-700 font-medium mb-1">Data extracted successfully</p>
            <p className="text-green-600">
              {Object.keys(document.extraction_data.extractedFields || document.extraction_data).length} fields found
            </p>
          </div>
        )}
        
        {/* Timestamp */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
          <span>
            Added: {new Date(document.created_at).toLocaleTimeString()}
          </span>
          {document.last_updated !== document.created_at && (
            <span>
              Updated: {new Date(document.last_updated).toLocaleTimeString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentUploadStatus;