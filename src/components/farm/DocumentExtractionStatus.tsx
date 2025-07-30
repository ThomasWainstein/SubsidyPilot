import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useLatestDocumentExtraction } from '@/hooks/useDocumentExtractions';
import { retryDocumentExtraction } from '@/utils/aiExtractionUtils';
import { toast } from '@/hooks/use-toast';

interface DocumentExtractionStatusProps {
  documentId: string;
  fileName: string;
  onExtractionUpdate?: () => void;
}

const DocumentExtractionStatus: React.FC<DocumentExtractionStatusProps> = ({
  documentId,
  fileName,
  onExtractionUpdate
}) => {
  const { data: extraction, isLoading, refetch } = useLatestDocumentExtraction(documentId);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetryExtraction = async () => {
    setIsRetrying(true);
    try {
      const result = await retryDocumentExtraction(documentId);
      
      if (result.success) {
        toast({
          title: 'Extraction Restarted',
          description: 'AI extraction has been restarted for this document.',
        });
        setTimeout(() => {
          refetch();
          onExtractionUpdate?.();
        }, 2000);
      } else {
        toast({
          title: 'Retry Failed',
          description: result.error || 'Failed to restart extraction',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to retry extraction',
        variant: 'destructive',
      });
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            <span className="text-sm">Checking extraction status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!extraction) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Clock className="h-4 w-4 mr-2 text-amber-600" />
            AI Extraction Pending
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            AI extraction for "{fileName}" is being processed. This may take a few minutes.
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => refetch()}
            className="w-full"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Check Status
          </Button>
        </CardContent>
      </Card>
    );
  }

  const extractedData = extraction.extracted_data as any;
  const confidence = extractedData?.confidence || 0;
  const extractedFields = Object.keys(extractedData?.extractedFields || {});
  const hasError = extraction.status === 'failed' || extractedData?.error;

  return (
    <Card className={`${hasError ? 'border-red-200 bg-red-50' : confidence > 0.7 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center">
            {hasError ? (
              <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
            ) : confidence > 0.7 ? (
              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2 text-amber-600" />
            )}
            AI Extraction Results
          </div>
          <Badge variant={hasError ? "destructive" : confidence > 0.7 ? "default" : "secondary"} className="text-xs">
            {hasError ? 'Failed' : `${Math.round(confidence * 100)}% confident`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasError ? (
          <div className="space-y-3">
            <p className="text-sm text-red-700">
              {extractedData?.error || extraction.error_message || 'Extraction failed'}
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRetryExtraction}
              disabled={isRetrying}
              className="w-full"
            >
              {isRetrying ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry Extraction
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Extracted {extractedFields.length} field{extractedFields.length !== 1 ? 's' : ''} from "{fileName}"
            </p>
            
            {extractedFields.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fields extracted:</p>
                <div className="flex flex-wrap gap-1">
                  {extractedFields.slice(0, 4).map((field: string) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                  {extractedFields.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{extractedFields.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {confidence < 0.7 && (
              <div className="flex items-start text-amber-700 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                <span>Low confidence - please review extracted data carefully</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRetryExtraction}
                disabled={isRetrying}
                className="flex-1"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Re-extract
                  </>
                )}
              </Button>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => refetch()}
                className="flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentExtractionStatus;