
import { Farm } from '@/data/farms';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import TagBadge from './TagBadge';
import StatusBadge from './StatusBadge';
import FarmStatusBadge from './FarmStatusBadge';
import { CalendarDays } from 'lucide-react';
import { getRandomSubsidies } from '@/data/subsidies';

interface FarmCardProps {
  farm: Farm;
}

const FarmCard = ({ farm }: FarmCardProps) => {
  const { t } = useLanguage();

  // Convert id to number to ensure it works with modulo
  const farmId = typeof farm.id === 'string' ? parseInt(farm.id, 10) : farm.id;
  const showNewSubsidyBadge = farmId % 3 === 0;
  const showDocumentsRequiredBadge = farmId % 5 === 0;
  const showInReviewBadge = farm.status === 'In Review';
  const showReadyToSubmitBadge = farm.status === 'Profile Complete';

  // Get a random subsidy for the "New Subsidy" badge link
  const randomSubsidies = getRandomSubsidies(farm.id.toString());
  const newSubsidyLink = `/farm/${farm.id}/subsidies#${randomSubsidies[0]?.id}`;

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg relative">
      {/* New Subsidy Badge - Positioned absolutely in top right */}
      {showNewSubsidyBadge && (
        <Link
          to={newSubsidyLink}
          className="absolute top-2 right-2 z-10 animate-pulse" // Initially pulsing
        >
          <FarmStatusBadge type="newSubsidy" />
        </Link>
      )}

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
        {(showDocumentsRequiredBadge || showInReviewBadge || showReadyToSubmitBadge) && (
          <div className="flex flex-wrap gap-2 mb-4">
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
