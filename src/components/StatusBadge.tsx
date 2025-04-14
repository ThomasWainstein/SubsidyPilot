
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
  
  // Get color based on status - muted, elegant colors
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'In Progress': 'bg-blue-50 text-blue-700 border-blue-100',
      'Submitted': 'bg-indigo-50 text-indigo-700 border-indigo-100',
      'Approved': 'bg-green-50 text-green-700 border-green-100',
      'In Review': 'bg-amber-50 text-amber-700 border-amber-100',
      'Needs Update': 'bg-red-50 text-red-700 border-red-100',
      'Profile Complete': 'bg-emerald-50 text-emerald-700 border-emerald-100',
      'Subsidy In Progress': 'bg-sky-50 text-sky-700 border-sky-100',
      'Draft': 'bg-gray-50 text-gray-700 border-gray-100',
    };
    
    return colorMap[status] || 'bg-gray-50 text-gray-700 border-gray-100';
  };

  // Get size classes
  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    const sizeMap: Record<string, string> = {
      'sm': 'px-1.5 py-0.5 text-xs',
      'md': 'px-2 py-0.5 text-xs',
      'lg': 'px-2.5 py-1 text-sm',
    };
    
    return sizeMap[size] || 'px-2 py-0.5 text-xs';
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
