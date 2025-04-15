
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
      'In Preparation': 'status.inPreparation',
      'Ready to Submit': 'status.readyToSubmit'
    };
    
    return statusMap[status] || ('status.inProgress' as TranslationKey);
  };
  
  // Updated color scheme with dark mode support
  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-50 border-blue-200 dark:border-blue-700',
      'Submitted': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-50 border-indigo-200 dark:border-indigo-700',
      'Approved': 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-50 border-green-200 dark:border-green-700',
      'In Review': 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-50 border-amber-200 dark:border-amber-700',
      'Needs Update': 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-50 border-red-200 dark:border-red-700',
      'Profile Complete': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-50 border-emerald-200 dark:border-emerald-700',
      'Subsidy In Progress': 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-50 border-sky-200 dark:border-sky-700',
      'Draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-50 border-gray-200 dark:border-gray-700',
    };
    
    return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-50 border-gray-200 dark:border-gray-700';
  };

  // Get size classes with added centering and justification
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
        'inline-flex items-center justify-center text-center rounded-full font-medium border',
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
