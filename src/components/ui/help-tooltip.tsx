import React from 'react';
import { HelpCircle } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  maxWidth?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  className,
  side = 'top',
  maxWidth = 'max-w-xs'
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn("h-auto w-auto p-1 text-muted-foreground hover:text-foreground", className)}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side} className={cn("text-sm", maxWidth)}>
          {typeof content === 'string' ? <p>{content}</p> : content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};