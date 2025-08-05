import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConfidenceBadgeProps {
  confidence: number;
  field?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
}

export const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-700 bg-green-100 border-green-200';
  if (confidence >= 0.5) return 'text-orange-700 bg-orange-100 border-orange-200'; 
  return 'text-red-700 bg-red-100 border-red-200';
};

export const getConfidenceLevel = (confidence: number): 'high' | 'medium' | 'low' => {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
};

export const getConfidenceIcon = (confidence: number) => {
  if (confidence >= 0.8) return <TrendingUp className="w-3 h-3" />;
  if (confidence >= 0.5) return <Minus className="w-3 h-3" />;
  return <TrendingDown className="w-3 h-3" />;
};

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ 
  confidence, 
  field, 
  size = 'md',
  showProgress = false,
  className = ''
}) => {
  const percentage = Math.round(confidence * 100);
  const level = getConfidenceLevel(confidence);
  const colorClasses = getConfidenceColor(confidence);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const getConfidenceDescription = () => {
    switch (level) {
      case 'high':
        return `High confidence (${percentage}%) - AI is very confident in this extraction. Safe to accept.`;
      case 'medium':
        return `Medium confidence (${percentage}%) - AI has reasonable confidence. Please review carefully.`;
      case 'low':
        return `Low confidence (${percentage}%) - AI is uncertain about this extraction. Manual verification recommended.`;
    }
  };

  const badge = (
    <div 
      className={`
        inline-flex items-center space-x-1 rounded-full font-medium border
        ${colorClasses} ${sizeClasses[size]} ${className}
      `}
      role="status"
      aria-label={`Confidence level: ${percentage}% ${level}`}
    >
      {getConfidenceIcon(confidence)}
      <span>{percentage}%</span>
      {field && (
        <HelpCircle className="w-3 h-3 opacity-60" aria-hidden="true" />
      )}
    </div>
  );

  if (field || showProgress) {
    return (
      <TooltipProvider>
        <div className="flex flex-col space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              {badge}
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2">
                {field && (
                  <p className="font-medium">Field: {field}</p>
                )}
                <p className="text-sm">{getConfidenceDescription()}</p>
                {showProgress && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Confidence Level</span>
                      <span>{level.toUpperCase()}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return badge;
};

export default ConfidenceBadge;