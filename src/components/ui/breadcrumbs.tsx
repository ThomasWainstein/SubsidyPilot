import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path?: string;  // Made optional - current/final items don't need paths
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ 
  items, 
  className,
  showHome = true 
}) => {
  const navigate = useNavigate();

  const allItems = showHome 
    ? [{ label: 'Home', path: '/dashboard', icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav className={cn("flex items-center space-x-1 text-sm", className)}>
      {allItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {item.path ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path!)}
              className="h-auto p-1 hover:bg-accent font-normal"
            >
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </Button>
          ) : (
            <span className="text-muted-foreground flex items-center">
              {item.icon && <span className="mr-1">{item.icon}</span>}
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};