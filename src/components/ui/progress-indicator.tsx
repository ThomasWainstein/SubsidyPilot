import React from 'react';
import { Progress } from '@/components/ui/progress';
import { StatusBadge, StatusType } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface ProgressStep {
  label: string;
  status: StatusType;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep: number;
  progress?: number;
  showProgress?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  progress,
  showProgress = false,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {showProgress && progress !== undefined && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              index === currentStep && "bg-accent/50 border-accent",
              index < currentStep && "bg-muted/30",
              index > currentStep && "opacity-60"
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background">
              <span className="text-sm font-medium">{index + 1}</span>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{step.label}</h4>
                <StatusBadge status={step.status} />
              </div>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};