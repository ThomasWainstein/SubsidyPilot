import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatusType = 
  | 'ready' 
  | 'processing' 
  | 'completed' 
  | 'error' 
  | 'warning'
  | 'pending'
  | 'cancelled'
  | 'running'
  | 'stopped';

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  showIcon?: boolean;
  variant?: 'default' | 'outline';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showIcon = true,
  variant = 'default',
  className
}) => {
  const getStatusConfig = (status: StatusType) => {
    switch (status) {
      case 'ready':
        return {
          icon: CheckCircle,
          color: 'bg-green-500/10 text-green-700 border-green-200',
          label: 'Ready'
        };
      case 'processing':
      case 'running':
        return {
          icon: Loader2,
          color: 'bg-blue-500/10 text-blue-700 border-blue-200',
          label: 'Processing',
          animate: true
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'bg-green-500/10 text-green-700 border-green-200',
          label: 'Completed'
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'bg-red-500/10 text-red-700 border-red-200',
          label: 'Error'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
          label: 'Warning'
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-gray-500/10 text-gray-700 border-gray-200',
          label: 'Pending'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          color: 'bg-gray-500/10 text-gray-700 border-gray-200',
          label: 'Cancelled'
        };
      case 'stopped':
        return {
          icon: Pause,
          color: 'bg-orange-500/10 text-orange-700 border-orange-200',
          label: 'Stopped'
        };
      default:
        return {
          icon: Clock,
          color: 'bg-gray-500/10 text-gray-700 border-gray-200',
          label: status
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant={variant}
      className={cn(
        "flex items-center gap-1 font-medium",
        variant === 'default' && config.color,
        className
      )}
    >
      {showIcon && (
        <Icon 
          className={cn(
            "h-3 w-3",
            config.animate && "animate-spin"
          )} 
        />
      )}
      {text || config.label}
    </Badge>
  );
};