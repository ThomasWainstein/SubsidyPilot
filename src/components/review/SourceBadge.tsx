import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Cpu, 
  Brain, 
  Zap,
  HelpCircle 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ExtractionSource = 'rule-based' | 'ai-based' | 'merged' | 'manual';

interface SourceBadgeProps {
  source: ExtractionSource;
  size?: 'sm' | 'md';
  className?: string;
}

const getSourceConfig = (source: ExtractionSource) => {
  switch (source) {
    case 'rule-based':
      return {
        label: 'Rule-based',
        icon: <Cpu className="w-3 h-3" />,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Extracted using pattern-based rules and regular expressions. Fast and consistent for structured documents.',
      };
    case 'ai-based':
      return {
        label: 'AI',
        icon: <Brain className="w-3 h-3" />,
        className: 'bg-purple-50 text-purple-700 border-purple-200',
        description: 'Extracted using AI language models. Better at understanding context and unstructured text.',
      };
    case 'merged':
      return {
        label: 'Hybrid',
        icon: <Zap className="w-3 h-3" />,
        className: 'bg-green-50 text-green-700 border-green-200',
        description: 'Combined results from both rule-based and AI extraction methods for optimal accuracy.',
      };
    case 'manual':
      return {
        label: 'Manual',
        icon: <HelpCircle className="w-3 h-3" />,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        description: 'Manually entered or corrected by user.',
      };
    default:
      return {
        label: 'Unknown',
        icon: <HelpCircle className="w-3 h-3" />,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        description: 'Source method unknown.',
      };
  }
};

const SourceBadge: React.FC<SourceBadgeProps> = ({ 
  source, 
  size = 'sm', 
  className = '' 
}) => {
  const config = getSourceConfig(source);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5'
  };

  const badge = (
    <Badge 
      variant="outline" 
      className={`
        inline-flex items-center space-x-1 font-medium
        ${config.className} ${sizeClasses[size]} ${className}
      `}
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label} Extraction</p>
            <p className="text-xs text-muted-foreground">
              {config.description}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SourceBadge;