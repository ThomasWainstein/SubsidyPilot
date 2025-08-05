import React from 'react';
import { AlertTriangle, RefreshCw, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ExtractionErrorBoundaryProps {
  error: Error;
  resetError: () => void;
  context?: {
    documentId?: string;
    documentName?: string;
    phase?: 'upload' | 'extraction' | 'review' | 'application';
  };
}

const ExtractionErrorBoundary: React.FC<ExtractionErrorBoundaryProps> = ({ 
  error, 
  resetError, 
  context 
}) => {
  const getErrorType = (error: Error) => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('extraction') || message.includes('ai')) {
      return 'extraction';
    }
    if (message.includes('validation') || message.includes('format')) {
      return 'validation';
    }
    if (message.includes('permission') || message.includes('auth')) {
      return 'permission';
    }
    return 'unknown';
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'network':
        return <RefreshCw className="h-6 w-6 text-orange-500" />;
      case 'extraction':
        return <FileX className="h-6 w-6 text-red-500" />;
      case 'validation':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'permission':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getErrorMessage = (type: string, originalMessage: string) => {
    switch (type) {
      case 'network':
        return 'Network connection error. Please check your internet connection and try again.';
      case 'extraction':
        return 'Document extraction failed. The document may be corrupted or in an unsupported format.';
      case 'validation':
        return 'Data validation failed. Some field values are invalid or missing.';
      case 'permission':
        return 'Permission denied. You may not have access to this resource.';
      default:
        return originalMessage;
    }
  };

  const getSuggestions = (type: string, context?: ExtractionErrorBoundaryProps['context']) => {
    const suggestions: string[] = [];
    
    switch (type) {
      case 'network':
        suggestions.push('Check your internet connection');
        suggestions.push('Try refreshing the page');
        suggestions.push('Wait a moment and try again');
        break;
      case 'extraction':
        suggestions.push('Ensure the document is not corrupted');
        suggestions.push('Try uploading a different format (PDF, DOCX)');
        suggestions.push('Use AI extraction as fallback');
        break;
      case 'validation':
        suggestions.push('Review field values for correct format');
        suggestions.push('Check required fields are filled');
        suggestions.push('Verify numeric fields contain valid numbers');
        break;
      case 'permission':
        suggestions.push('Log out and log back in');
        suggestions.push('Contact system administrator');
        break;
      default:
        suggestions.push('Try refreshing the page');
        suggestions.push('Contact support if the problem persists');
    }
    
    return suggestions;
  };

  const errorType = getErrorType(error);
  const errorMessage = getErrorMessage(errorType, error.message);
  const suggestions = getSuggestions(errorType, context);

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          {getErrorIcon(errorType)}
          <span>
            {context?.phase && (
              <Badge variant="outline" className="mr-2 text-xs">
                {context.phase}
              </Badge>
            )}
            Something went wrong
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {context?.documentName && (
          <div className="text-sm text-gray-600">
            <strong>Document:</strong> {context.documentName}
          </div>
        )}
        
        <div className="text-sm text-red-700 bg-red-100 p-3 rounded-md">
          {errorMessage}
        </div>

        {suggestions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Try these solutions:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={resetError} 
            size="sm"
            aria-label="Try again"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Try Again
          </Button>
          
          {context?.documentId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Copy error details to clipboard for support
                navigator.clipboard.writeText(
                  `Error Details:\nDocument: ${context.documentName}\nPhase: ${context.phase}\nError: ${error.message}\nStack: ${error.stack}`
                );
              }}
              aria-label="Copy error details"
            >
              Copy Error Details
            </Button>
          )}
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-500 border-t pt-2">
            <summary className="cursor-pointer font-medium">Technical Details</summary>
            <pre className="mt-2 whitespace-pre-wrap bg-gray-100 p-2 rounded text-xs overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

export default ExtractionErrorBoundary;