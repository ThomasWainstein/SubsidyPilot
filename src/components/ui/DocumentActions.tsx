import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, ExternalLink, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface DocumentActionsProps {
  isRetryable: boolean;
  isRetrying: boolean;
  onRetry: () => void;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  errorCode?: string;
  errorMessage?: string;
  documentId: string;
  className?: string;
}

export function DocumentActions({
  isRetryable,
  isRetrying,
  onRetry,
  retryCount,
  maxRetries,
  nextRetryAt,
  errorCode,
  errorMessage,
  documentId,
  className
}: DocumentActionsProps) {
  const canRetry = isRetryable && !isRetrying && retryCount < maxRetries;
  const isMaxRetriesReached = retryCount >= maxRetries;
  
  const timeUntilRetry = nextRetryAt ? 
    Math.max(0, Math.ceil((new Date(nextRetryAt).getTime() - Date.now()) / 1000)) : 0;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <span>Actions</span>
          {errorCode && (
            <Badge variant="destructive" className="text-xs">
              {errorCode.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Retry Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Retry Processing</span>
                <Badge variant="outline" className="text-xs">
                  {retryCount}/{maxRetries}
                </Badge>
              </div>
              
              {timeUntilRetry > 0 && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Next retry in {Math.ceil(timeUntilRetry / 60)} minutes</span>
                </div>
              )}
            </div>
            
            <Button
              onClick={onRetry}
              disabled={!canRetry || timeUntilRetry > 0}
              size="sm"
              variant={canRetry ? "default" : "secondary"}
              className={cn(
                "transition-all duration-200",
                isRetrying && "animate-pulse"
              )}
            >
              <RotateCcw className={cn(
                "w-4 h-4 mr-2",
                isRetrying && "animate-spin"
              )} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </div>

          {/* Retry Status Messages */}
          {isMaxRetriesReached && (
            <div className="flex items-start space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Maximum retries reached
                </p>
                <p className="text-xs text-destructive/80">
                  Contact support if the issue persists
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-muted/50 border border-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Error:</span> {errorMessage}
              </p>
            </div>
          )}

          {!isRetryable && !errorMessage && (
            <div className="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">
                Processing completed successfully
              </span>
            </div>
          )}
        </div>

        {/* View Logs Link */}
        <div className="pt-3 border-t border-muted">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const url = `https://supabase.com/dashboard/project/gvfgvbztagafjykncwto/logs/explorer?q=document_id%3D%27${documentId}%27`;
              window.open(url, '_blank');
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Processing Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}