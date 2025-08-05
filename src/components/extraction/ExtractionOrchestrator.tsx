import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Bot, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useHybridExtraction } from '@/hooks/useHybridExtraction';

interface ExtractionOrchestratorProps {
  farmId: string;
  onComplete?: (formData: Record<string, any>) => void;
  className?: string;
}

export const ExtractionOrchestrator: React.FC<ExtractionOrchestratorProps> = ({
  farmId,
  onComplete,
  className
}) => {
  const {
    extractFromDocument,
    retryWithAI,
    isExtracting,
    extractionResult,
    error,
    hasResults,
    reset
  } = useHybridExtraction({
    onSuccess: (result) => {
      console.log('Extraction completed:', result);
      onComplete?.(result.extractedFields);
    },
    onError: (error) => {
      console.error('Extraction failed:', error);
    }
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // For demo purposes, we'll simulate upload and extraction
    const file = files[0]; // Process first file
    console.log('Processing file:', file.name);
    
    // In real implementation, you'd upload to Supabase and get a URL
    // For now, we'll just trigger extraction with a mock URL
    try {
      await extractFromDocument('mock-url', 'mock-doc-id');
    } catch (error) {
      console.error('Extraction failed:', error);
    }
  };

  const getStatusIcon = () => {
    if (isExtracting) return <Bot className="h-4 w-4 animate-spin" />;
    if (error) return <XCircle className="h-4 w-4 text-red-600" />;
    if (hasResults) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    return <Upload className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isExtracting) return 'Extracting data from document...';
    if (error) return error.message || 'An error occurred';
    if (hasResults) return 'Extraction completed';
    return 'Ready to upload documents';
  };

  const handleComplete = () => {
    if (extractionResult) {
      onComplete?.(extractionResult.extractedFields);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Document Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status and Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{getStatusText()}</span>
            <Badge variant={error ? 'destructive' : hasResults ? 'default' : 'secondary'}>
              {isExtracting ? 'extracting' : error ? 'error' : hasResults ? 'completed' : 'idle'}
            </Badge>
          </div>
          
          {isExtracting && (
            <Progress value={50} className="w-full" />
          )}
        </div>

        {/* File Upload */}
        {!isExtracting && !hasResults && (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.jpg,.jpeg,.png"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Upload documents for extraction</span>
              <span className="text-xs text-muted-foreground">
                PDF, Word, Excel, Text, or Image files
              </span>
            </label>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error.message}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              className="ml-auto"
            >
              Reset
            </Button>
          </div>
        )}

        {/* Extraction Results */}
        {hasResults && extractionResult && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Extraction Results</h4>
              
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Document</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {extractionResult.source}
                    </Badge>
                    <Badge 
                      variant={extractionResult.confidence > 0.7 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {Math.round(extractionResult.confidence * 100)}%
                    </Badge>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {extractionResult.fieldsCount} fields extracted
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => retryWithAI('mock-url', 'mock-doc-id')}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry with AI
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={reset}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion */}
        {hasResults && extractionResult && (
          <div className="pt-4">
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{extractionResult.fieldsCount}</span> fields ready for form
              </div>
              <Button onClick={handleComplete}>
                Complete Review
              </Button>
            </div>
          </div>
        )}

        {/* Reset Option */}
        {hasResults && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="w-full"
            >
              Start New Extraction
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExtractionOrchestrator;