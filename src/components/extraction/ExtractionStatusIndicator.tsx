import React from 'react';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Zap,
  Bot,
  Sparkles 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ExtractionStatusIndicatorProps {
  status: 'idle' | 'uploading' | 'extracting' | 'reviewing' | 'completed' | 'failed';
  progress?: number;
  source?: 'rule-based' | 'ai-based' | 'merged' | 'error';
  confidence?: number;
  error?: string;
  className?: string;
  showProgress?: boolean;
  showConfidence?: boolean;
}

const ExtractionStatusIndicator: React.FC<ExtractionStatusIndicatorProps> = ({
  status,
  progress = 0,
  source,
  confidence,
  error,
  className,
  showProgress = false,
  showConfidence = false
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'extracting':
        return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />;
      case 'reviewing':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'idle':
        return 'text-gray-500';
      case 'uploading':
        return 'text-blue-600';
      case 'extracting':
        return 'text-purple-600';
      case 'reviewing':
        return 'text-yellow-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Waiting to start';
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'extracting':
        return 'Extracting data...';
      case 'reviewing':
        return 'Needs review';
      case 'completed':
        return 'Completed';
      case 'failed':
        return error || 'Failed';
      default:
        return 'Unknown status';
    }
  };

  const getSourceIcon = () => {
    switch (source) {
      case 'rule-based':
        return <Zap className="h-3 w-3 text-blue-500" />;
      case 'ai-based':
        return <Bot className="h-3 w-3 text-purple-500" />;
      case 'merged':
        return <Sparkles className="h-3 w-3 text-green-500" />;
      default:
        return null;
    }
  };

  const getSourceText = () => {
    switch (source) {
      case 'rule-based':
        return 'Rule-based';
      case 'ai-based':
        return 'AI-powered';
      case 'merged':
        return 'Hybrid';
      default:
        return null;
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600 bg-green-50';
    if (conf >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main status */}
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className={cn('text-sm font-medium', getStatusColor())}>
          {getStatusText()}
        </span>
        
        {/* Source badge */}
        {source && status === 'completed' && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            {getSourceIcon()}
            <span>{getSourceText()}</span>
          </Badge>
        )}
        
        {/* Confidence badge */}
        {showConfidence && confidence !== undefined && status === 'completed' && (
          <Badge 
            variant="outline" 
            className={cn('text-xs', getConfidenceColor(confidence))}
          >
            {Math.round(confidence * 100)}% confident
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (status === 'uploading' || status === 'extracting') && (
        <div className="space-y-1">
          <Progress 
            value={progress} 
            className="h-2" 
            aria-label={`${status} progress`}
          />
          {status === 'extracting' && (
            <div className="text-xs text-muted-foreground">
              {progress < 30 ? 'Parsing document...' :
               progress < 60 ? 'Extracting fields...' :
               progress < 90 ? 'Validating data...' :
               'Finalizing...'}
            </div>
          )}
        </div>
      )}

      {/* Error details */}
      {status === 'failed' && error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExtractionStatusIndicator;