
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, FileWarning, Check, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/language';
import { cn } from '@/lib/utils';

type BadgeType = 'newSubsidy' | 'documentsRequired' | 'inReview' | 'readyToSubmit';

interface FarmStatusBadgeProps {
  type: BadgeType;
  className?: string;
  isNew?: boolean;
}

const FarmStatusBadge: React.FC<FarmStatusBadgeProps> = ({ type, className, isNew }) => {
  const { t } = useLanguage();

  const badgeConfig = {
    newSubsidy: {
      label: t('common.newSubsidyAvailable'),
      icon: Bell,
      variant: 'success' as const,
      classes: cn(
        'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
        isNew && 'animate-pulse'
      )
    },
    documentsRequired: {
      label: t('common.documentsRequired'),
      icon: FileWarning,
      variant: 'destructive' as const,
      classes: 'bg-red-100 text-red-800 hover:bg-red-200'
    },
    inReview: {
      label: t('common.inReview'),
      icon: AlertTriangle,
      variant: 'warning' as const,
      classes: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    },
    readyToSubmit: {
      label: t('common.readyToSubmit'),
      icon: Check,
      variant: 'default' as const,
      classes: 'bg-green-100 text-green-800 hover:bg-green-200'
    }
  };

  const config = badgeConfig[type];
  const IconComponent = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex gap-1 items-center cursor-pointer transition-colors',
        config.classes,
        className
      )}
    >
      <IconComponent className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
};

export default FarmStatusBadge;
