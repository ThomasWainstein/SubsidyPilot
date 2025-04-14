
import React from 'react';
import { cn } from '@/lib/utils';

interface NewLabelProps {
  className?: string;
}

const NewLabel: React.FC<NewLabelProps> = ({ className }) => {
  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full animate-pulse",
        className
      )}
    >
      NEW
    </span>
  );
};

export default NewLabel;
