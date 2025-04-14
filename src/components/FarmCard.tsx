import { Farm } from '@/data/farms';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import TagBadge from './TagBadge';
import StatusBadge from './StatusBadge';
import FarmStatusBadge from './FarmStatusBadge';
import { CalendarDays, Bell } from 'lucide-react';
import { getRandomSubsidies } from '@/data/subsidies';
import { useState, useEffect } from 'react';

interface FarmCardProps {
  farm: Farm;
}

const FarmCard = ({ farm }: FarmCardProps) => {
  const { t } = useLanguage();
  const [alertCount, setAlertCount] = useState(0);
  const [isNewAlert, setIsNewAlert] = useState(false);

  useEffect(() => {
    const farmId = typeof farm.id === 'string' ? parseInt(farm.id, 10) : farm.id;
    let count = 0;
    
    if (farmId % 3 === 0) count++;
    if (farmId % 5 === 0) count++;
    if (farm.status === 'In Review') count++;
    if (farm.status === 'Profile Complete') count++;
    
    setAlertCount(count);
    
    if (count > 0) {
      setIsNewAlert(true);
      const timer = setTimeout(() => {
        setIsNewAlert(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [farm]);

  const randomSubsidies = getRandomSubsidies(farm.id.toString());
  const newSubsidyLink = `/farm/${farm.id}/subsidies#${randomSubsidies[0]?.id}`;

  const showNewSubsidyBadge = parseInt(farm.id, 10) % 3 === 0;
  const showDocumentsRequiredBadge = parseInt(farm.id, 10) % 5 === 0;
  const showInReviewBadge = farm.status === 'In Review';
  const showReadyToSubmitBadge = farm.status === 'Profile Complete';

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg relative">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{farm.name}</h3>
          <div className="flex items-center">
            {alertCount > 0 && (
              <div className="relative mr-2">
                <Bell size={18} className="text-gray-600" />
                <div className={`absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full ${isNewAlert ? 'animate-pulse' : ''}`}>
                  {alertCount > 99 ? '99+' : alertCount}
                </div>
              </div>
            )}
            <StatusBadge status={farm.status} />
          </div>
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

        {(showDocumentsRequiredBadge || showInReviewBadge || showReadyToSubmitBadge || showNewSubsidyBadge) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {showNewSubsidyBadge && (
              <Link
                to={newSubsidyLink}
                className="no-underline"
              >
                <FarmStatusBadge type="newSubsidy" isNew={true} />
              </Link>
            )}
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
