import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Eye, 
  Download,
  FileText,
  Zap
} from 'lucide-react';

interface ProcessingStatusProps {
  isProcessing: boolean;
  currentStage: string;
  progress: number;
  result?: {
    success: boolean;
    extractionId: string;
    confidence: number;
    needsReview: boolean;
    documentType: string;
    extractedFields: Record<string, any>;
    processingTime: number;
  };
  error?: string | null;
  onRetryWithBetterModel?: () => void;
  onShowReview?: () => void;
  onDownloadResults?: () => void;
}

const DocumentProcessingStatus: React.FC<ProcessingStatusProps> = ({
  isProcessing,
  currentStage,
  progress,
  result,
  error,
  onRetryWithBetterModel,
  onShowReview,
  onDownloadResults
}) => {
  const getStageIcon = (stage: string) => {
    const iconClass = "h-4 w-4";
    switch (stage.toLowerCase()) {
      case 'downloading':
        return <Download className={iconClass} />;
      case 'ocr-extraction':
        return <Eye className={iconClass} />;
      case 'classification':
        return <FileText className={iconClass} />;
      case 'structured-extraction':
        return <Zap className={iconClass} />;
      case 'validation':
        return <CheckCircle className={iconClass} />;
      case 'completed':
        return <CheckCircle className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const formatStage = (stage: string) => {
    return stage
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Processing Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          {onRetryWithBetterModel && (
            <div className="mt-4">
              <Button 
                onClick={onRetryWithBetterModel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry with Better Model
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isProcessing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStageIcon(currentStage)}
            Processing Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{formatStage(currentStage)}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Processing your document with AI...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <Card className={result.needsReview ? 'border-yellow-200' : 'border-green-200'}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Processing Complete
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {result.documentType}
              </Badge>
              <Badge 
                variant="outline" 
                className={getConfidenceColor(result.confidence)}
              >
                {Math.round(result.confidence * 100)}% Confidence
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.needsReview && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This document needs manual review due to low confidence or validation issues.
                Please review and correct the extracted fields.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Processing Time</div>
              <div className="font-medium">{result.processingTime}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">Fields Extracted</div>
              <div className="font-medium">{Object.keys(result.extractedFields).length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Document Type</div>
              <div className="font-medium capitalize">{result.documentType}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-medium">
                {result.needsReview ? 'Needs Review' : 'Completed'}
              </div>
            </div>
          </div>

          {Object.keys(result.extractedFields).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Extracted Fields Preview:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(result.extractedFields).slice(0, 6).map(([key, field]: [string, any]) => (
                  <div key={key} className="flex justify-between p-2 bg-muted rounded">
                    <span className="capitalize font-medium">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-muted-foreground truncate ml-2">
                      {field.value || 'Not found'}
                    </span>
                  </div>
                ))}
                {Object.keys(result.extractedFields).length > 6 && (
                  <div className="col-span-full text-center text-muted-foreground">
                    +{Object.keys(result.extractedFields).length - 6} more fields...
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {result.needsReview && onShowReview && (
              <Button onClick={onShowReview} className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Review & Correct
              </Button>
            )}
            
            {!result.needsReview && result.confidence < 0.8 && onRetryWithBetterModel && (
              <Button 
                onClick={onRetryWithBetterModel}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry with Better Model
              </Button>
            )}
            
            {onDownloadResults && (
              <Button 
                onClick={onDownloadResults}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          Ready to process document
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentProcessingStatus;