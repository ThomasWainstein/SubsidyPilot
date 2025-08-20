import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubsidyDetailErrorBoundaryProps {
  children: React.ReactNode;
  subsidyId?: string;
}

const SubsidyDetailErrorBoundary: React.FC<SubsidyDetailErrorBoundaryProps> = ({ 
  children, 
  subsidyId 
}) => {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Subsidy Detail Page Error:', error, errorInfo);
    console.error('Subsidy ID:', subsidyId);
  };

  const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        
        <h2 className="text-xl font-semibold mb-2">Unable to Load Subsidy Details</h2>
        
        <p className="text-muted-foreground mb-6">
          We encountered an error while loading the subsidy information. This might be due to 
          a temporary issue or the subsidy may no longer be available.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-3 bg-muted rounded text-left text-sm">
            <p className="font-mono text-destructive">{error.message}</p>
            {subsidyId && <p className="mt-1 text-muted-foreground">Subsidy ID: {subsidyId}</p>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={resetError}
            variant="default"
            className="flex-1"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          
          <Button 
            onClick={() => navigate('/search')}
            variant="outline"
            className="flex-1"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
        </div>

        <Button 
          onClick={() => window.location.href = 'mailto:support@agritool.com?subject=Subsidy%20Detail%20Error&body=Error%20loading%20subsidy%20' + subsidyId}
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
        >
          Contact Support
        </Button>
      </Card>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={ErrorFallback}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default SubsidyDetailErrorBoundary;