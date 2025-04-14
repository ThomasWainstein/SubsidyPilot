
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/language';

interface MatchConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

const MatchConfidenceBadge = ({ confidence, className }: MatchConfidenceBadgeProps) => {
  const { t } = useLanguage();

  // Get color based on match confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (confidence >= 80) {
      return 'bg-teal-100 text-teal-800 border-teal-200';
    } else if (confidence >= 70) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (confidence >= 60) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border',
        getConfidenceColor(confidence),
        className
      )}
    >
      {t('subsidies.matchConfidence')}: {confidence}%
    </span>
  );
};

export default MatchConfidenceBadge;
