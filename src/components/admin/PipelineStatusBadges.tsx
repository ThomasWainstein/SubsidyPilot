import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react';

interface PipelineStatusBadgesProps {
  currentStage: string;
  progress: number;
  status: string;
}

export const PipelineStatusBadges: React.FC<PipelineStatusBadgesProps> = ({
  currentStage,
  progress,
  status
}) => {
  const getStageStatus = (stage: string) => {
    const stageOrder = ['harvest', 'ai', 'forms'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const stageIndex = stageOrder.indexOf(stage);
    
    if (status === 'failed' && stageIndex === currentIndex) {
      return 'failed';
    }
    
    if (stageIndex < currentIndex || (stageIndex === currentIndex && status === 'completed')) {
      return 'completed';
    } else if (stageIndex === currentIndex && status === 'running') {
      return 'processing';
    } else {
      return 'pending';
    }
  };

  const getBadgeVariant = (stageStatus: string) => {
    switch (stageStatus) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getIcon = (stageStatus: string) => {
    switch (stageStatus) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <PlayCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (stageStatus: string) => {
    switch (stageStatus) {
      case 'completed': return 'Done';
      case 'processing': return 'Processing';
      case 'failed': return 'Failed';
      default: return 'Pending';
    }
  };

  const stages = [
    { name: 'harvest', label: 'Content Harvest' },
    { name: 'ai', label: 'AI Processing' },
    { name: 'forms', label: 'Form Generation' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((stage) => {
        const stageStatus = getStageStatus(stage.name);
        return (
          <Badge
            key={stage.name}
            variant={getBadgeVariant(stageStatus)}
            className="flex items-center gap-1"
          >
            {getIcon(stageStatus)}
            {stage.label}: {getStatusText(stageStatus)}
          </Badge>
        );
      })}
    </div>
  );
};