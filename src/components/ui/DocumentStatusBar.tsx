import React from 'react';
import { cn } from '@/lib/utils';
import { ExtractionStatus } from '@/hooks/useDocumentStatus';
import { CheckCircle, XCircle, Clock, Loader2, AlertTriangle, Shield, Brain, Scan } from 'lucide-react';

interface DocumentStatusBarProps {
  status: ExtractionStatus;
  progress: number;
  step: string;
  lastUpdated?: string;
  className?: string;
}

const STEPS = [
  { key: 'uploading', label: 'Upload', icon: Clock },
  { key: 'virus_scan', label: 'Security', icon: Shield },
  { key: 'extracting', label: 'Extract', icon: Scan },
  { key: 'ocr', label: 'OCR', icon: Scan },
  { key: 'ai', label: 'AI Analysis', icon: Brain },
  { key: 'completed', label: 'Complete', icon: CheckCircle },
] as const;

export function DocumentStatusBar({ 
  status, 
  progress, 
  step, 
  lastUpdated, 
  className 
}: DocumentStatusBarProps) {
  const currentStepIndex = STEPS.findIndex(s => s.key === status);
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Progress Bar */}
      <div className="relative">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{step}</span>
          <span>{progress}%</span>
        </div>
        
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-500 ease-out",
              isFailed 
                ? "bg-destructive" 
                : isCompleted 
                  ? "bg-success" 
                  : "bg-primary"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((stepItem, index) => {
          const Icon = stepItem.icon;
          const isCurrentStep = index === currentStepIndex;
          const isCompletedStep = index < currentStepIndex || isCompleted;
          const isFailedStep = isFailed && index === currentStepIndex;
          
          return (
            <div key={stepItem.key} className="flex flex-col items-center space-y-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isFailedStep && "border-destructive bg-destructive/10 text-destructive",
                  isCompletedStep && !isFailedStep && "border-success bg-success/10 text-success",
                  isCurrentStep && !isFailedStep && !isCompletedStep && "border-primary bg-primary/10 text-primary animate-pulse",
                  !isCurrentStep && !isCompletedStep && !isFailedStep && "border-muted bg-muted/10 text-muted-foreground"
                )}
              >
                {isFailedStep ? (
                  <XCircle className="w-4 h-4" />
                ) : isCurrentStep && !isCompletedStep ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompletedStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isFailedStep && "text-destructive",
                  isCompletedStep && !isFailedStep && "text-success",
                  isCurrentStep && !isFailedStep && !isCompletedStep && "text-primary",
                  !isCurrentStep && !isCompletedStep && !isFailedStep && "text-muted-foreground"
                )}
              >
                {stepItem.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status Messages */}
      {isFailed && (
        <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-sm text-destructive font-medium">
            Processing failed at {step.toLowerCase()} step
          </span>
        </div>
      )}

      {lastUpdated && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}