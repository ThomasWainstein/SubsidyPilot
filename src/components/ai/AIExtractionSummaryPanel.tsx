/**
 * AI Extraction Summary Panel - Shows extraction results and status
 * Addresses critical issue where AI tokens are consumed but extraction appears ineffective
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  Database,
  Eye,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface ExtractionSummary {
  documentId: string;
  fileName: string;
  extractionId?: string;
  status: 'not_started' | 'processing' | 'completed' | 'failed';
  confidence: number;
  fieldsExtracted: number;
  totalFields: number;
  fieldsSaved: number;
  qaPassed: boolean;
  qaScore?: number;
  model: string;
  tokensUsed?: number;
  processingTime?: number;
  lastAttempt?: string;
  errorMessage?: string;
  extractedData?: Record<string, any>;
  mappedData?: Record<string, any>;
  validationErrors?: string[];
  unmappedFields?: string[];
}

interface AIExtractionSummaryPanelProps {
  extraction: ExtractionSummary;
  onRetryExtraction?: () => void;
  onApplyToProfile?: () => void;
  onViewDetails?: () => void;
  onDownloadLog?: () => void;
  isRetrying?: boolean;
}

const AIExtractionSummaryPanel: React.FC<AIExtractionSummaryPanelProps> = ({
  extraction,
  onRetryExtraction,
  onApplyToProfile,
  onViewDetails,
  onDownloadLog,
  isRetrying = false
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Brain className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const handleViewData = () => {
    if (extraction.extractedData) {
      console.log('📊 Extracted Data:', extraction.extractedData);
      console.log('🗂️ Mapped Data:', extraction.mappedData);
      toast.success('Extraction data logged to console - check browser dev tools');
    }
    onViewDetails?.();
  };

  const completionPercentage = extraction.totalFields > 0 
    ? Math.round((extraction.fieldsExtracted / extraction.totalFields) * 100)
    : 0;

  return (
    <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>AI Extraction Summary</span>
          </div>
          <Badge className={`text-xs ${getStatusColor(extraction.status)}`}>
            {getStatusIcon(extraction.status)}
            <span className="ml-1 capitalize">{extraction.status.replace('_', ' ')}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Document Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium truncate max-w-48" title={extraction.fileName}>
              {extraction.fileName}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Model: {extraction.model}
          </span>
        </div>

        {/* Extraction Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Fields Extracted: {extraction.fieldsExtracted}/{extraction.totalFields}</span>
            <span className={getConfidenceColor(extraction.confidence)}>
              {extraction.confidence}% confidence
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Fields Saved:</span>
              <span className="font-medium text-green-600">
                {extraction.fieldsSaved} ✅
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">QA Status:</span>
              <span className={`font-medium ${extraction.qaPassed ? 'text-green-600' : 'text-red-600'}`}>
                {extraction.qaPassed ? 'Passed' : 'Failed'} 
                {extraction.qaScore && ` (${extraction.qaScore}%)`}
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            {extraction.tokensUsed && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tokens Used:</span>
                <span className="font-medium">{extraction.tokensUsed.toLocaleString()}</span>
              </div>
            )}
            {extraction.processingTime && (
              <div className="flex justify-between">
                <span className="text-gray-600">Processing:</span>
                <span className="font-medium">{extraction.processingTime}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* Warnings */}
        {(extraction.unmappedFields?.length || 0) > 0 && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="flex items-center gap-1 text-yellow-800">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">
                {extraction.unmappedFields?.length} unmapped fields detected
              </span>
            </div>
          </div>
        )}

        {(extraction.validationErrors?.length || 0) > 0 && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="flex items-center gap-1 text-red-800">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">
                {extraction.validationErrors?.length} validation errors
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {extraction.errorMessage && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
            <div className="text-red-800">
              <strong>Error:</strong> {extraction.errorMessage}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          {extraction.status === 'completed' && extraction.fieldsSaved > 0 && (
            <Button
              size="sm"
              onClick={onApplyToProfile}
              className="flex items-center gap-1"
            >
              <Database className="h-3 w-3" />
              Apply to Profile
            </Button>
          )}
          
          {(extraction.status === 'failed' || extraction.confidence < 70) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetryExtraction}
              disabled={isRetrying}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry AI'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleViewData}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            Debug Data
          </Button>

          {onDownloadLog && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadLog}
              className="flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Download Log
            </Button>
          )}
        </div>

        {/* Performance Metrics */}
        {extraction.status === 'completed' && (
          <div className="text-xs text-gray-500 pt-2 border-t flex items-center justify-between">
            <span>
              Last extracted: {extraction.lastAttempt ? new Date(extraction.lastAttempt).toLocaleTimeString() : 'N/A'}
            </span>
            {extraction.extractionId && (
              <span className="font-mono">
                ID: {extraction.extractionId.slice(-8)}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIExtractionSummaryPanel;