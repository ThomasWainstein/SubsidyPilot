import React, { useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { useRealTimeProcessing } from '@/hooks/useRealTimeProcessing';

interface RealTimeProgressDisplayProps {
  documentId: string;
  onComplete?: (extractedData: any) => void;
}

export function RealTimeProgressDisplay({ documentId, onComplete }: RealTimeProgressDisplayProps) {
  const { processingState, isConnected, getProcessingSummary } = useRealTimeProcessing(documentId);
  
  const summary = getProcessingSummary();

  useEffect(() => {
    if (processingState?.isComplete && processingState.extractedData && onComplete) {
      onComplete(processingState.extractedData);
    }
  }, [processingState?.isComplete, processingState?.extractedData, onComplete]);

  if (!processingState) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center gap-3">
          <div className="animate-pulse w-4 h-4 bg-primary/20 rounded-full" />
          <span className="text-muted-foreground">Initializing processing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Real-time connection active' : 'Connection lost'}
          </span>
        </div>
        
        {processingState.totalTime && (
          <div className="text-sm text-muted-foreground">
            Completed in {(processingState.totalTime / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      {/* Overall Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Processing Progress</h3>
          <span className="text-sm font-medium">
            {summary?.completed || 0}/{summary?.total || 6} stages
          </span>
        </div>
        
        <div className="relative">
          <Progress 
            value={processingState.overallProgress} 
            className="h-3"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-primary-foreground">
              {processingState.overallProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* Stage Details */}
      <div className="space-y-3">
        {processingState.stages.map((stage, index) => (
          <div key={stage.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stage.status === 'completed' ? 'bg-success text-success-foreground' :
                  stage.status === 'processing' ? 'bg-primary text-primary-foreground animate-pulse' :
                  stage.status === 'error' ? 'bg-destructive text-destructive-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {stage.status === 'completed' ? '✓' :
                   stage.status === 'processing' ? '○' :
                   stage.status === 'error' ? '✗' :
                   index + 1}
                </div>
                <div>
                  <h4 className="font-medium">{stage.name}</h4>
                  {stage.status === 'processing' && (
                    <p className="text-sm text-muted-foreground">In progress...</p>
                  )}
                  {stage.status === 'error' && stage.error && (
                    <p className="text-sm text-destructive">{stage.error}</p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium">
                  {stage.progress}%
                </div>
                {stage.endTime && stage.startTime && (
                  <div className="text-xs text-muted-foreground">
                    {((stage.endTime.getTime() - stage.startTime.getTime()) / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
            
            <Progress value={stage.progress} className="h-2" />
            
            {stage.results && (
              <div className="mt-3 text-xs text-muted-foreground">
                <details>
                  <summary className="cursor-pointer hover:text-foreground">
                    View results
                  </summary>
                  <pre className="mt-2 bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(stage.results, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final Results */}
      {processingState.isComplete && processingState.extractedData && (
        <div className="bg-success/5 border border-success/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-success">Processing Complete!</h3>
            <div className="flex items-center gap-4 text-sm">
              {processingState.confidenceScore && (
                <span className="text-muted-foreground">
                  Confidence: {(processingState.confidenceScore * 100).toFixed(1)}%
                </span>
              )}
              {processingState.processingMethod && (
                <span className="text-muted-foreground">
                  Method: {processingState.processingMethod}
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Extracted Data:</h4>
            <div className="bg-background rounded border p-4 max-h-64 overflow-auto">
              <pre className="text-sm">
                {JSON.stringify(processingState.extractedData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {processingState.hasError && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
              ✗
            </div>
            <h3 className="text-lg font-semibold text-destructive">Processing Failed</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            The document processing encountered an error during the {processingState.currentStage} stage.
            Please try uploading the document again or contact support if the issue persists.
          </p>
        </div>
      )}
    </div>
  );
}