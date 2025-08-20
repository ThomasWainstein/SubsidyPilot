import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SubsidyErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    resetError: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface SubsidyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SubsidyErrorBoundary extends React.Component<
  SubsidyErrorBoundaryProps,
  SubsidyErrorBoundaryState
> {
  constructor(props: SubsidyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SubsidyErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Subsidy component error:', error, errorInfo);
    
    // Log to production error tracking
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            resetError={this.resetError} 
          />
        );
      }

      return (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800 dark:text-orange-200">
                Something went wrong
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
              Unable to load subsidy information. This might be due to:
            </p>
            <ul className="text-xs text-orange-600 dark:text-orange-400 mb-4 space-y-1">
              <li>• Network connectivity issues</li>
              <li>• Temporary server problems</li>
              <li>• Data formatting errors</li>
            </ul>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={this.resetError}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.reload()}
                className="text-orange-600 hover:bg-orange-100"
              >
                Refresh Page
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="text-xs text-orange-600 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-orange-800 mt-2 p-2 bg-orange-100 rounded overflow-auto">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default SubsidyErrorBoundary;