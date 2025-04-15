
import { Farm } from '@/data/farms';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import TagBadge from './TagBadge';
import StatusBadge from './StatusBadge';
import FarmAlertsDropdown from './FarmAlertsDropdown';
import { CalendarDays, ChevronDown, MapPin } from 'lucide-react';
import { getRandomSubsidies } from '@/data/subsidies';
import { useState, useEffect } from 'react';

interface FarmCardProps {
  farm: Farm;
}

const FarmCard = ({ farm }: FarmCardProps) => {
  const { t } = useLanguage();
  const [alertCount, setAlertCount] = useState(0);
  const [isNewAlert, setIsNewAlert] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [areTagsCollapsed, setAreTagsCollapsed] = useState(true);

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

  const shouldCollapseTags = farm.tags.length > 2;
  const visibleTags = areTagsCollapsed && shouldCollapseTags 
    ? farm.tags.slice(0, 2) 
    : farm.tags;
  const hiddenTagsCount = shouldCollapseTags ? farm.tags.length - 2 : 0;

  // Format region and country display
  const getLocationDisplay = () => {
    // Extract region and country from farm.region
    const parts = farm.region.split(',').map(part => part.trim());
    
    if (parts.length === 1) {
      // If it's just a region without country (likely French region)
      return `${parts[0]}, France`;
    } else {
      // It already has country information
      return farm.region;
    }
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md relative dark:bg-dark-card dark:hover:bg-dark-surface-hover">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{farm.name}</h3>
          <div className="flex items-center space-x-2 relative">
            {alertCount > 0 && (
              <div className="relative">
                <FarmAlertsDropdown
                  farmId={farm.id.toString()}
                  isOpen={isAlertsOpen}
                  setIsOpen={setIsAlertsOpen}
                  showNewSubsidyBadge={showNewSubsidyBadge}
                  showDocumentsRequiredBadge={showDocumentsRequiredBadge}
                  showInReviewBadge={showInReviewBadge}
                  showReadyToSubmitBadge={showReadyToSubmitBadge}
                  alertCount={alertCount}
                  isNewAlert={isNewAlert}
                  newSubsidyLink={newSubsidyLink}
                />
              </div>
            )}
            <StatusBadge status={farm.status} size="sm" />
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          <CalendarDays size={14} className="mr-1 flex-shrink-0" />
          <span className="text-xs">{t('common.lastUpdated')}: {farm.updatedAt}</span>
        </div>
        
        <div className="mb-5 flex items-center">
          <MapPin size={14} className="mr-1 flex-shrink-0 text-gray-500 dark:text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-300">{getLocationDisplay()}</p>
        </div>
        
        {farm.tags.length > 0 && (
          <div className={`tags-container mb-6 ${areTagsCollapsed ? 'collapsed' : ''}`}>
            <div className="flex flex-wrap">
              {visibleTags.map((tag, index) => (
                <TagBadge key={index} tag={tag} />
              ))}
              
              {shouldCollapseTags && (
                <button 
                  onClick={() => setAreTagsCollapsed(!areTagsCollapsed)}
                  className="tags-toggle flex items-center dark:bg-gray-700 dark:text-gray-300"
                >
                  {areTagsCollapsed ? (
                    <>+{hiddenTagsCount} more <ChevronDown size={12} className="ml-1" /></>
                  ) : (
                    <>Show less <ChevronDown size={12} className="ml-1 transform rotate-180" /></>
                  )}
                </button>
              )}
            </div>
            
            {!areTagsCollapsed && shouldCollapseTags && (
              <div className="tags-overflow mt-2 flex flex-wrap">
                {farm.tags.slice(2).map((tag, index) => (
                  <TagBadge key={`overflow-${index}`} tag={tag} />
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900 dark:hover:text-emerald-200">
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
