
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
          <details className="text-sm text-gray-500">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        
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
      </CardContent>
    </Card>
  );
};

export default GenericErrorFallback;
