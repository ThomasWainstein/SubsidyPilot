import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Settings, HelpCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backPath?: string;
  customBreadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  backPath,
  customBreadcrumbs,
  className
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getDefaultBreadcrumbs = (): BreadcrumbItem[] => {
    return [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Admin Panel', path: '/admin' }
    ];
  };

  const breadcrumbs = customBreadcrumbs || getDefaultBreadcrumbs();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className={cn("border-b bg-card/50 backdrop-blur-sm", className)}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            
            <div>
              <Breadcrumbs items={breadcrumbs} showHome={true} />
              {(title || subtitle) && (
                <div className="mt-2">
                  {title && (
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <Shield className="h-6 w-6 text-primary" />
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-muted-foreground mt-1">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings')}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>

            <HelpTooltip
              content={
                <div className="space-y-2">
                  <p className="font-medium">Admin Interface Help</p>
                  <p>Enhanced AgriTool administration interface with loading states, tooltips, and navigation.</p>
                  <p className="text-xs text-muted-foreground">Click any button to see what it does, or contact support for assistance.</p>
                </div>
              }
              maxWidth="max-w-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};