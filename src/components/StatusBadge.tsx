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
  
  // Updated color scheme with dark mode support
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100 border-blue-100 dark:border-blue-800',
      'Submitted': 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-100 border-indigo-100 dark:border-indigo-800',
      'Approved': 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100 border-green-100 dark:border-green-800',
      'In Review': 'bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-100 border-amber-100 dark:border-amber-800',
      'Needs Update': 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100 border-red-100 dark:border-red-800',
      'Profile Complete': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100 border-emerald-100 dark:border-emerald-800',
      'Subsidy In Progress': 'bg-sky-50 text-sky-700 dark:bg-sky-900 dark:text-sky-100 border-sky-100 dark:border-sky-800',
      'Draft': 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-100 border-gray-100 dark:border-gray-700',
    };
    
    return colorMap[status] || 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-100 border-gray-100 dark:border-gray-700';
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
