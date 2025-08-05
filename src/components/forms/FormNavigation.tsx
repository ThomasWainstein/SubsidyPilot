import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { FormSectionSchema } from './DynamicFormGenerator';

interface FormNavigationProps {
  sections: FormSectionSchema[];
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
  errors?: Record<string, boolean>;
}

export const FormNavigation: React.FC<FormNavigationProps> = ({
  sections,
  currentStep,
  onStepClick,
  completedSteps,
  errors = {}
}) => {
  return (
    <div className="bg-background border rounded-lg p-4">
      <h3 className="font-medium mb-3">Form Progress</h3>
      <div className="flex flex-wrap gap-2">
        {sections.map((section, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const hasError = errors[section.id];
          
          return (
            <Button
              key={section.id}
              variant={isCurrent ? "default" : "outline"}
              size="sm"
              onClick={() => onStepClick(index)}
              className={cn(
                "flex items-center gap-2 text-sm",
                hasError && "border-destructive text-destructive",
                isCompleted && !isCurrent && "border-green-500 text-green-600"
              )}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : hasError ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              
              <span>{index + 1}. {section.title}</span>
              
              {section.required && (
                <Badge variant="destructive" className="text-xs ml-1">
                  Required
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};