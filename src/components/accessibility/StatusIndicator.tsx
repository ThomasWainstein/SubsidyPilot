import React from 'react';
import { AlertTriangle, CheckCircle, Clock, FileX } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'high' | 'medium' | 'low' | 'complete' | 'pending' | 'missing';
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, label, size = 'md' }) => {
  const getIndicatorConfig = () => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4', 
      lg: 'w-5 h-5'
    };

    const iconSize = {
      sm: 10,
      md: 14,
      lg: 18
    };

    switch (status) {
      case 'high':
        return {
          color: 'bg-red-500 text-white',
          icon: AlertTriangle,
          shape: 'rounded-sm', // Square for high priority
          iconColor: 'text-red-500'
        };
      case 'medium':
        return {
          color: 'bg-orange-500 text-white',
          icon: Clock,
          shape: 'rounded-md', // Rounded for medium priority
          iconColor: 'text-orange-500'
        };
      case 'low':
        return {
          color: 'bg-yellow-500 text-black',
          icon: Clock,
          shape: 'rounded-full', // Circle for low priority
          iconColor: 'text-yellow-600'
        };
      case 'complete':
        return {
          color: 'bg-green-500 text-white',
          icon: CheckCircle,
          shape: 'rounded-full',
          iconColor: 'text-green-500'
        };
      case 'pending':
        return {
          color: 'bg-blue-500 text-white',
          icon: Clock,
          shape: 'rounded-md',
          iconColor: 'text-blue-500'
        };
      case 'missing':
        return {
          color: 'bg-gray-500 text-white',
          icon: FileX,
          shape: 'rounded-sm',
          iconColor: 'text-gray-500'
        };
      default:
        return {
          color: 'bg-gray-300 text-gray-800',
          icon: Clock,
          shape: 'rounded-full',
          iconColor: 'text-gray-500'
        };
    }
  };

  const config = getIndicatorConfig();
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
  const iconSize = size === 'sm' ? 10 : size === 'md' ? 14 : 18;

  return (
    <div
      className={`inline-flex items-center gap-1 ${config.color} ${config.shape} ${sizeClass} p-1`}
      role="status"
      aria-label={`Status: ${status} - ${label}`}
      title={`${status.charAt(0).toUpperCase() + status.slice(1)} priority: ${label}`}
    >
      <Icon 
        size={iconSize} 
        className="flex-shrink-0" 
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default StatusIndicator;