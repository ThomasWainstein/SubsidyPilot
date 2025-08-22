/**
 * Streaming Progress Display Component
 * Phase 3: Real-time progress visualization with stage breakdown
 */
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  FileText, 
  Search, 
  Brain, 
  Merge, 
  Shield,
  Upload
} from 'lucide-react';
import { ProcessingStage } from '@/hooks/useStreamingProcessing';

interface StreamingProgressDisplayProps {
  stages: ProcessingStage[];
  overallProgress: number;
  currentStage: string | null;
  partialResults: { [key: string]: any };
  isComplete: boolean;
  error: string | null;
  totalProcessingTime: number;
  estimatedTimeRemaining: number;
}

const getStageIcon = (stageId: string) => {
  switch (stageId) {
    case 'upload': return Upload;
    case 'text-extraction': return FileText;
    case 'pattern-analysis': return Search;
    case 'ai-processing': return Brain;
    case 'data-merging': return Merge;
    case 'validation': return Shield;
    default: return Clock;
  }
};

const getStageColor = (status: ProcessingStage['status']) => {
  switch (status) {
    case 'completed': return 'text-success';
    case 'processing': return 'text-primary';
    case 'failed': return 'text-destructive';
    default: return 'text-muted-foreground';
  }
};

const getStatusIcon = (status: ProcessingStage['status']) => {
  switch (status) {
    case 'completed': return CheckCircle;
    case 'processing': return Loader2;
    case 'failed': return XCircle;
    default: return Clock;
  }
};

export const StreamingProgressDisplay: React.FC<StreamingProgressDisplayProps> = ({
  stages,
  overallProgress,
  currentStage,
  partialResults,
  isComplete,
  error,
  totalProcessingTime,
  estimatedTimeRemaining
}) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getProcessingStats = () => {
    const completed = stages.filter(s => s.status === 'completed').length;
    const failed = stages.filter(s => s.status === 'failed').length;
    const processing = stages.filter(s => s.status === 'processing').length;
    
    return { completed, failed, processing, total: stages.length };
  };

  const stats = getProcessingStats();

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Streaming Processing Pipeline
          </CardTitle>
          <Badge 
            variant={isComplete ? "secondary" : error ? "destructive" : "default"}
            className="font-mono"
          >
            {overallProgress}%
          </Badge>
        </div>
        
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {currentStage || (isComplete ? 'Complete' : error ? 'Failed' : 'Starting...')}
            </span>
            <span className="font-mono">
              {stats.completed}/{stats.total} stages
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Time Information */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            Total: {formatTime(totalProcessingTime)}
          </span>
          {!isComplete && !error && estimatedTimeRemaining > 0 && (
            <span>
              ETA: {formatTime(estimatedTimeRemaining)}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stage Breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Processing Stages</h4>
          
          {stages.map((stage, index) => {
            const StageIcon = getStageIcon(stage.id);
            const StatusIcon = getStatusIcon(stage.status);
            const stageTime = stage.startTime && stage.endTime 
              ? stage.endTime - stage.startTime 
              : 0;
            
            return (
              <div key={stage.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <div className={`flex-shrink-0 ${getStageColor(stage.status)}`}>
                  <StageIcon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{stage.name}</span>
                    <div className="flex items-center gap-2">
                      {stageTime > 0 && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatTime(stageTime)}
                        </span>
                      )}
                      <div className={getStageColor(stage.status)}>
                        <StatusIcon 
                          className={`h-4 w-4 ${
                            stage.status === 'processing' ? 'animate-spin' : ''
                          }`} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Stage Progress */}
                  <div className="space-y-1">
                    <Progress value={stage.progress} className="h-1" />
                    <div className="flex justify-between text-xs">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          stage.status === 'completed' ? 'border-success text-success' :
                          stage.status === 'processing' ? 'border-primary text-primary' :
                          stage.status === 'failed' ? 'border-destructive text-destructive' :
                          'border-muted-foreground text-muted-foreground'
                        }`}
                      >
                        {stage.status}
                      </Badge>
                      <span className="text-muted-foreground font-mono">
                        {stage.progress}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Stage Error */}
                  {stage.error && (
                    <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                      {stage.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Partial Results */}
        {Object.keys(partialResults).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Progressive Results</h4>
              
              {Object.entries(partialResults).map(([stageId, results]) => {
                const stage = stages.find(s => s.id === stageId);
                const fieldsCount = results && typeof results === 'object' 
                  ? Object.keys(results).length 
                  : 0;
                
                if (fieldsCount === 0) return null;
                
                return (
                  <div key={stageId} className="p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-success">
                        {stage?.name || stageId} Results
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {fieldsCount} fields
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs max-h-32 overflow-y-auto">
                      {Object.entries(results).slice(0, 8).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize truncate">
                            {key.replace(/([A-Z])/g, ' $1').trim()}:
                          </span>
                          <span className="font-mono text-right max-w-24 truncate">
                            {String(value) || 'N/A'}
                          </span>
                        </div>
                      ))}
                      {fieldsCount > 8 && (
                        <div className="col-span-2 text-center text-muted-foreground">
                          ... and {fieldsCount - 8} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Processing Stats */}
        <Separator />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-success">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-lg font-semibold text-primary">{stats.processing}</div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-lg font-semibold text-destructive">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-lg font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Global Error */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Processing Failed
            </div>
            <p className="text-xs text-destructive/80">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {isComplete && !error && (
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center gap-2 text-success font-medium text-sm">
              <CheckCircle className="h-4 w-4" />
              Processing Complete!
            </div>
            <p className="text-xs text-success/80 mt-1">
              All stages completed successfully in {formatTime(totalProcessingTime)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};