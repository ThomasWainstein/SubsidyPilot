/**
 * Enhanced Progress Display combining both approaches
 * Features: Comprehensive logging, fallback polling, better error handling
 */
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { useRealTimeProcessingEnhanced } from '@/hooks/useRealTimeProcessingEnhanced';
import { ExtractedDataViewer } from './ExtractedDataViewer';

interface EnhancedProgressDisplayProps {
  documentId: string;
  onComplete?: (extractedData: any) => void;
}

export function EnhancedProgressDisplay({ documentId, onComplete }: EnhancedProgressDisplayProps) {
  const { 
    job, 
    stages, 
    overallProgress, 
    currentStage,
    isComplete, 
    connected, 
    lastEventAt,
    getCompletedStagesCount,
    getTotalStagesCount,
    hasError
  } = useRealTimeProcessingEnhanced({ documentId });

  // Trigger completion callback only once per job
  const [hasTriggeredCompletion, setHasTriggeredCompletion] = React.useState(false);
  
  React.useEffect(() => {
    if (isComplete && job && onComplete && !hasTriggeredCompletion) {
      // Simulate extracted data from job metadata
      const extractedData = job.metadata?.extractedData || { 
        fields: Object.keys(job.metadata || {}).length,
        processing_time: job.processing_time_ms,
        method: job.metadata?.processing_method || 'ai-enhanced'
      };
      onComplete(extractedData);
      setHasTriggeredCompletion(true);
    }
  }, [isComplete, job, onComplete, hasTriggeredCompletion]);

  if (!job) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="animate-pulse w-4 h-4 bg-primary/20 rounded-full" />
            <span className="text-muted-foreground">Initializing processing...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection & Status Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Real-time Processing Status</CardTitle>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {connected ? (
                  <Wifi className="h-4 w-4 text-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm text-muted-foreground">
                  {connected ? 'Connected' : 'Reconnecting...'}
                </span>
              </div>
              
              {/* Last Event */}
              {lastEventAt && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Last update: {Math.round((Date.now() - lastEventAt) / 1000)}s ago
                  </span>
                </div>
              )}
              
              {/* Job Status Badge */}
              <Badge variant={
                job.status === 'completed' ? 'default' :
                job.status === 'processing' ? 'secondary' :
                job.status === 'failed' ? 'destructive' : 'outline'
              }>
                {job.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Overall Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Overall Progress</h3>
              <span className="text-sm font-medium">
                {getCompletedStagesCount()}/{getTotalStagesCount()} stages • {overallProgress}%
              </span>
            </div>
            
            <div className="relative">
              <Progress value={overallProgress} className="h-3" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground drop-shadow">
                  {overallProgress}%
                </span>
              </div>
            </div>
            
            {currentStage && (
              <p className="text-sm text-muted-foreground">
                Currently processing: <strong>{currentStage}</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stage Progress */}
      <div className="space-y-3">
        <h3 className="font-semibold">Stage Details</h3>
        
        {stages.map((stage, index) => (
          <Card key={stage.id} className={`transition-all ${
            stage.status === 'processing' ? 'ring-2 ring-primary/20 bg-primary/5' : ''
          }`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    stage.status === 'completed' ? 'bg-success text-success-foreground' :
                    stage.status === 'processing' ? 'bg-primary text-primary-foreground animate-pulse' :
                    stage.status === 'failed' ? 'bg-destructive text-destructive-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {stage.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                     stage.status === 'failed' ? <AlertCircle className="h-4 w-4" /> :
                     stage.status === 'processing' ? '○' :
                     index + 1}
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{stage.name}</h4>
                    {stage.status === 'processing' && (
                      <p className="text-sm text-primary animate-pulse">Processing...</p>
                    )}
                    {stage.status === 'failed' && stage.error && (
                      <p className="text-sm text-destructive">{stage.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">{stage.progress}%</div>
                  {stage.endTime && stage.startTime && (
                    <div className="text-xs text-muted-foreground">
                      {((stage.endTime.getTime() - stage.startTime.getTime()) / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
              
              <Progress value={stage.progress} className="h-2" />
              
              {/* Stage Results Preview */}
              {stage.results && (
                <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                  <details>
                    <summary className="cursor-pointer hover:text-foreground font-medium">
                      View extracted data ({Object.keys(stage.results || {}).length} fields)
                    </summary>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(stage.results, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Processing Complete with Extracted Data */}
      {isComplete && !hasError() && (
        <Card className="border-success bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
              <div>
                <h3 className="text-lg font-semibold text-success">Processing Complete!</h3>
                <p className="text-sm text-muted-foreground">
                  Document processed successfully in {job.processing_time_ms ? `${(job.processing_time_ms / 1000).toFixed(1)}s` : 'real-time'}
                </p>
              </div>
            </div>
            
            {job.metadata && (
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="font-medium">Processing Method:</span>
                  <p className="text-muted-foreground">{job.metadata.processing_method || 'AI Enhanced'}</p>
                </div>
                <div>
                  <span className="font-medium">Fields Extracted:</span>
                  <p className="text-muted-foreground">{Object.keys(job.metadata || {}).length}</p>
                </div>
              </div>
            )}
            
            <ExtractedDataViewer documentId={job.document_id} />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {hasError() && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-destructive">Processing Failed</h3>
                <p className="text-sm text-muted-foreground">
                  {job.error_message || 'An error occurred during processing'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">Debug Information</summary>
        <div className="mt-2 p-3 bg-muted rounded">
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Job ID:</strong> {job.id}</div>
            <div><strong>Document ID:</strong> {job.document_id}</div>
            <div><strong>Priority:</strong> {job.priority}</div>
            <div><strong>Created:</strong> {new Date(job.created_at!).toLocaleTimeString()}</div>
            <div><strong>Connection:</strong> {connected ? '✅ Active' : '❌ Lost'}</div>
            <div><strong>Last Event:</strong> {lastEventAt ? `${Math.round((Date.now() - lastEventAt) / 1000)}s ago` : 'None'}</div>
          </div>
        </div>
      </details>
    </div>
  );
}