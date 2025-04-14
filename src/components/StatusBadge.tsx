
import { cn } from '@/lib/utils';
import { useLanguage, TranslationKey } from '@/contexts/language';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge = ({ status, className, size = 'md' }: StatusBadgeProps) => {
  const { t } = useLanguage();
  
  // Get translation key for the status
  const getStatusKey = (status: string): TranslationKey => {
    const statusMap: Record<string, TranslationKey> = {
      'In Progress': 'status.inProgress',
      'Submitted': 'status.submitted',
      'Approved': 'status.approved',
      'In Review': 'status.inReview',
      'Needs Update': 'status.needsUpdate',
      'Profile Complete': 'status.profileComplete',
      'Subsidy In Progress': 'status.subsidyInProgress',
      'Draft': 'status.draft',
    };
    
    return statusMap[status] || ('status.inProgress' as TranslationKey);
  };
  
  // Get color based on status
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Submitted': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Approved': 'bg-green-100 text-green-800 border-green-200',
      'In Review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Needs Update': 'bg-red-100 text-red-800 border-red-200',
      'Profile Complete': 'bg-green-100 text-green-800 border-green-200',
      'Subsidy In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'Draft': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get size classes
  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    const sizeMap: Record<string, string> = {
      'sm': 'px-1.5 py-0.5 text-xs',
      'md': 'px-2.5 py-0.5 text-xs',
      'lg': 'px-3 py-1 text-sm',
    };
    
    return sizeMap[size] || 'px-2.5 py-0.5 text-xs';
  };
  
  const displayStatus = t(getStatusKey(status));
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        getSizeClasses(size),
        getStatusColor(status),
        className
      )}
    >
      {displayStatus}
    </span>
  );
};

export default StatusBadge;
