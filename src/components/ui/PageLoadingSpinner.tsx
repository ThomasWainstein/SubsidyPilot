import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PageLoadingSpinner = React.memo(({ 
  message = 'Loading...', 
  size = 'md' 
}: PageLoadingSpinnerProps) => {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
});

PageLoadingSpinner.displayName = 'PageLoadingSpinner';

export default PageLoadingSpinner;