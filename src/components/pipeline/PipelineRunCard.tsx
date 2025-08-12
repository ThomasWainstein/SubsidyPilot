import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Square, 
  Clock, 
  Activity, 
  AlertTriangle,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { useActiveRun } from '@/hooks/useActiveRun';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { formatDistanceToNow } from 'date-fns';

export const PipelineRunCard: React.FC = () => {
  const { activeRun, isLoading, canStart, startRun, cancelRun } = useActiveRun();
  const { UI_RESUME_AI_ENABLED } = useFeatureFlags();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'canceled': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'init': return 'Initializing';
      case 'harvest': return 'Harvesting Data';
      case 'ai': return 'AI Processing';
      case 'forms': return 'Form Generation';
      case 'done': return 'Complete';
      default: return stage;
    }
  };

  const canResumeAI = activeRun?.stage === 'ai' && 
    activeRun?.status === 'running' && 
    UI_RESUME_AI_ENABLED;

  const resumeAI = async () => {
    // This would call the existing AI processing endpoint
    // Resume AI processing pipeline
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-muted h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Pipeline Status</CardTitle>
        {activeRun && (
          <Badge 
            variant="secondary"
            className={`${getStatusColor(activeRun.status)} text-white`}
          >
            {activeRun.status}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {activeRun ? (
          <div className="space-y-4">
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  {getStageLabel(activeRun.stage)}
                </span>
                <span>{activeRun.progress}%</span>
              </div>
              <Progress value={activeRun.progress} className="h-2" />
            </div>

            {/* Stats Grid */}
            {activeRun.stats && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {activeRun.stats.harvest && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Pages Scraped</p>
                      <p className="font-medium">{activeRun.stats.harvest.pages_scraped || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pages OK</p>
                      <p className="font-medium">{activeRun.stats.harvest.pages_ok || 0}</p>
                    </div>
                  </>
                )}
                {activeRun.stats.ai && (
                  <>
                    <div>
                      <p className="text-muted-foreground">AI Processed</p>
                      <p className="font-medium">{activeRun.stats.ai.pages_processed || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AI Success</p>
                      <p className="font-medium text-green-600">{activeRun.stats.ai.successful || 0}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Timeline */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Started {formatDistanceToNow(new Date(activeRun.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {activeRun.status === 'running' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cancelRun}
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
              
              {canResumeAI && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resumeAI}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Resume AI
                </Button>
              )}

              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                Logs
              </Button>
            </div>

            {/* Orphan Badge */}
            {/* This would be populated from v_orphan_pages_recent */}
            <div className="flex items-center gap-1 text-sm text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>2 orphan pages detected</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground">No active pipeline run</p>
            <Button 
              onClick={() => startRun()} 
              disabled={!canStart}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Full Pipeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};