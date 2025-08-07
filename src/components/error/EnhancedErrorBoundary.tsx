import React, { Component, ErrorInfo, ReactNode } from 'react';
import { prodLogger } from '@/utils/productionLogger';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<any>;
  context?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Enhanced error logging with context
    prodLogger.error(`Error in ${this.props.context || 'component'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Track error for monitoring
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: `${this.props.context || 'component'}: ${error.message}`,
        fatal: false
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback or default
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent 
          error={this.state.error} 
          resetError={() => this.setState({ hasError: false })}
          context={this.props.context}
        />;
      }

      // Default fallback with diagnostics
      return (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong in {this.props.context || 'this component'}
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-4">
            We've logged this error and our team has been notified.
          </p>
          
          {import.meta.env.DEV && this.state.error && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs bg-red-100 dark:bg-red-900 p-3 rounded overflow-auto max-h-40">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;