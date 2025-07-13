
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GenericErrorFallbackProps {
  error?: Error;
  resetError: () => void;
  showHomeButton?: boolean;
  customMessage?: string;
}

const GenericErrorFallback: React.FC<GenericErrorFallbackProps> = ({ 
  error, 
  resetError, 
  showHomeButton = true,
  customMessage 
}) => {
  const navigate = useNavigate();

  return (
    <Card className="max-w-lg mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          <AlertTriangle className="h-5 w-5" />
          <span>Something went wrong</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600">
          {customMessage || 'An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.'}
        </p>
        
        {error && (
          <div className="text-sm text-gray-700 border border-red-200 bg-red-50 p-3 rounded">
            <p className="font-medium text-red-800 mb-2">Error Details:</p>
            <pre className="text-xs text-red-700 overflow-auto whitespace-pre-wrap">
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
          
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              If this keeps happening, please contact our team so we can help you directly:
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.open('mailto:support@example.com?subject=Error Report&body=' + encodeURIComponent('Error: ' + (error?.message || 'Unknown error')), '_blank')}
              className="w-full"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenericErrorFallback;
