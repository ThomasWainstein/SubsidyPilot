import React, { useState, useEffect } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Tooltip,
  TooltipContent, 
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  tooltip?: string;
  loadingText?: string;
  showElapsedTime?: boolean;
  icon?: React.ReactNode;
  confirmAction?: boolean;
  confirmMessage?: string;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  loading = false,
  tooltip,
  loadingText,
  showElapsedTime = false,
  icon,
  confirmAction = false,
  confirmMessage = "Are you sure?",
  children,
  onClick,
  disabled,
  className,
  ...props
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!loading || !showElapsedTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, showElapsedTime]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (confirmAction && !showConfirm) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000); // Auto-hide after 3s
      return;
    }

    setShowConfirm(false);
    onClick?.(e);
  };

  const buttonContent = (
    <Button
      {...props}
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn(
        loading && "pointer-events-none",
        showConfirm && "bg-destructive hover:bg-destructive/90",
        className
      )}
    >
      {loading ? (
        <LoadingSpinner 
          size="sm" 
          text={loadingText}
          elapsedTime={showElapsedTime ? elapsedTime : undefined}
        />
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {showConfirm ? confirmMessage : children}
        </>
      )}
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
};