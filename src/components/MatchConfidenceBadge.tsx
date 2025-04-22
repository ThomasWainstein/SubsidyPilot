
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/language";

interface MatchConfidenceBadgeProps {
  confidence: number;
}

const MatchConfidenceBadge = ({ confidence }: MatchConfidenceBadgeProps) => {
  const { t } = useLanguage();
  
  let color: string;
  if (confidence >= 90) {
    color = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  } else if (confidence >= 75) {
    color = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  } else if (confidence >= 60) {
    color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
  } else {
    color = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }

  return (
    <Badge variant="outline" className={`${color} font-medium`}>
      {confidence}% {t('subsidies.matchConfidence')}
    </Badge>
  );
};

export default MatchConfidenceBadge;
