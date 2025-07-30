import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Cpu, 
  Brain, 
  Zap,
  RefreshCw,
  Settings 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExtractionMethodToggleProps {
  currentMethod: 'rule-based' | 'ai-based' | 'merged';
  confidence: number;
  fieldsCount: number;
  onRetryWithAI?: () => void;
  onRetryWithRules?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

const ExtractionMethodToggle: React.FC<ExtractionMethodToggleProps> = ({
  currentMethod,
  confidence,
  fieldsCount,
  onRetryWithAI,
  onRetryWithRules,
  isLoading = false,
  disabled = false,
  className = ''
}) => {
  const getMethodInfo = (method: string) => {
    switch (method) {
      case 'rule-based':
        return {
          icon: <Cpu className="w-4 h-4" />,
          label: 'Rule-based',
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          description: 'Fast pattern-based extraction'
        };
      case 'ai-based':
        return {
          icon: <Brain className="w-4 h-4" />,
          label: 'AI-powered',
          color: 'bg-purple-50 text-purple-700 border-purple-200',
          description: 'Intelligent context-aware extraction'
        };
      case 'merged':
        return {
          icon: <Zap className="w-4 h-4" />,
          label: 'Hybrid',
          color: 'bg-green-50 text-green-700 border-green-200',
          description: 'Combined rule-based and AI extraction'
        };
      default:
        return {
          icon: <Settings className="w-4 h-4" />,
          label: 'Unknown',
          color: 'bg-gray-50 text-gray-700 border-gray-200',
          description: 'Unknown extraction method'
        };
    }
  };

  const methodInfo = getMethodInfo(currentMethod);

  return (
    <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg border ${className}`}>
      <div className="flex items-center space-x-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={`flex items-center space-x-2 px-3 py-2 ${methodInfo.color}`}
              >
                {methodInfo.icon}
                <span className="font-medium">{methodInfo.label}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{methodInfo.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{fieldsCount}</strong> fields extracted
          </span>
          <span>•</span>
          <span>
            <strong className="text-foreground">{Math.round(confidence * 100)}%</strong> confidence
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {currentMethod !== 'ai-based' && onRetryWithAI && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetryWithAI}
                  disabled={disabled || isLoading}
                  className="flex items-center space-x-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4" />
                  )}
                  <span>Try AI</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Re-extract using AI for potentially better results</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {currentMethod !== 'rule-based' && onRetryWithRules && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetryWithRules}
                  disabled={disabled || isLoading}
                  className="flex items-center space-x-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cpu className="w-4 h-4" />
                  )}
                  <span>Try Rules</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Re-extract using rule-based patterns</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};

export default ExtractionMethodToggle;