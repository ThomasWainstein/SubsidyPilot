
import { Farm } from '@/data/farms';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import TagBadge from './TagBadge';
import StatusBadge from './StatusBadge';
import FarmStatusBadge from './FarmStatusBadge';
import { CalendarDays } from 'lucide-react';

interface FarmCardProps {
  farm: Farm;
}

const FarmCard = ({ farm }: FarmCardProps) => {
  const { t } = useLanguage();

  // Randomly determine which farms have badges (in a real app this would be based on actual farm data)
  const showNewSubsidyBadge = farm.id % 3 === 0;
  const showDocumentsRequiredBadge = farm.id % 5 === 0;
  const showInReviewBadge = farm.status === 'In Review';
  const showReadyToSubmitBadge = farm.status === 'Profile Complete';

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{farm.name}</h3>
          <StatusBadge status={farm.status} />
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <CalendarDays size={16} className="mr-1" />
          <span>{t('common.lastUpdated')}: {farm.updatedAt}</span>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">{farm.region}</p>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {farm.tags.map((tag, index) => (
            <TagBadge key={index} tag={tag} />
          ))}
        </div>

        {/* Alert badges */}
        {(showNewSubsidyBadge || showDocumentsRequiredBadge || showInReviewBadge || showReadyToSubmitBadge) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {showNewSubsidyBadge && <FarmStatusBadge type="newSubsidy" />}
            {showDocumentsRequiredBadge && <FarmStatusBadge type="documentsRequired" />}
            {showInReviewBadge && <FarmStatusBadge type="inReview" />}
            {showReadyToSubmitBadge && <FarmStatusBadge type="readyToSubmit" />}
          </div>
        )}
        
        <div className="flex justify-end">
          <Button asChild>
            <Link to={`/farm/${farm.id}`}>
              {t('common.openClientProfile')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FarmCard;
