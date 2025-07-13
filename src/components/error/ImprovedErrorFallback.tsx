import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Mail, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface ImprovedErrorFallbackProps {
  error?: Error;
  resetError: () => void;
  showHomeButton?: boolean;
  customMessage?: string;
  context?: string;
}

const ImprovedErrorFallback: React.FC<ImprovedErrorFallbackProps> = ({ 
  error, 
  resetError, 
  showHomeButton = true,
  customMessage,
  context = 'page'
}) => {
  const navigate = useNavigate();

  const isSelectItemError = error?.message?.includes('Select.Item') && error.message.includes('empty string');
  
  const copyErrorDetails = () => {
    const errorDetails = `
Error Context: ${context}
Error Message: ${error?.message || 'Unknown error'}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim();

    navigator.clipboard.writeText(errorDetails).then(() => {
      toast({
        title: 'Copied',
        description: 'Error details copied to clipboard',
      });
    });
  };

  const contactSupport = () => {
    const subject = encodeURIComponent(`Error Report - ${context}`);
    const body = encodeURIComponent(`
Hello Support Team,

I encountered an error while using the application:

Context: ${context}
Error: ${error?.message || 'Unknown error'}
Time: ${new Date().toISOString()}
Page: ${window.location.href}

${isSelectItemError ? 'This appears to be a form field error that occurred during document import.' : ''}

Please help me resolve this issue.

Thank you!
    `);

    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>
            {isSelectItemError ? 'Form Error Detected' : 'Something went wrong'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-gray-700">
          {customMessage ? (
            <p>{customMessage}</p>
          ) : isSelectItemError ? (
            <div>
              <p className="font-medium mb-2">A form component error occurred while processing your request.</p>
              <p className="text-sm">This typically happens when:</p>
              <ul className="text-sm list-disc list-inside ml-4 mt-1 space-y-1">
                <li>Document import fails to populate all required fields</li>
                <li>Invalid data is loaded into form dropdowns</li>
                <li>Network issues interrupt the form loading process</li>
              </ul>
            </div>
          ) : (
            <p>An unexpected error occurred. We're sorry for the inconvenience.</p>
          )}
        </div>
        
        {error && (
          <div className="text-sm border border-red-200 bg-red-50 p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-red-800">Technical Details:</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyErrorDetails}
                className="text-red-700 hover:text-red-900"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="text-xs text-red-700 overflow-auto whitespace-pre-wrap max-h-32">
              {error.message}
            </pre>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button onClick={resetError} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            {showHomeButton && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
          
          <div className="pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              {isSelectItemError 
                ? 'If this error persists, try manually filling out the form fields or contact our support team for assistance.'
                : 'If this keeps happening, please contact our team so we can help you directly:'
              }
            </p>
            <Button 
              variant="outline" 
              onClick={contactSupport}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImprovedErrorFallback;