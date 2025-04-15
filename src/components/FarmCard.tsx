import { Farm } from '@/data/farms';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import TagBadge from './TagBadge';
import StatusBadge from './StatusBadge';
import FarmStatusBadge from './FarmStatusBadge';
import { CalendarDays, Bell, ChevronDown, X } from 'lucide-react';
import { getRandomSubsidies } from '@/data/subsidies';
import { useState, useEffect, useRef } from 'react';

interface FarmCardProps {
  farm: Farm;
}

const FarmCard = ({ farm }: FarmCardProps) => {
  const { t } = useLanguage();
  const [alertCount, setAlertCount] = useState(0);
  const [isNewAlert, setIsNewAlert] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [areTagsCollapsed, setAreTagsCollapsed] = useState(true);
  const alertsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md relative">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{farm.name}</h3>
          <div className="flex items-center space-x-2">
            {alertCount > 0 && (
              <div className="relative" ref={alertsRef}>
                <button 
                  onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                  className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Bell size={18} className="text-gray-600" />
                  <div className={`absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full ${isNewAlert ? 'animate-pulse' : ''}`}>
                    {alertCount}
                  </div>
                </button>
                
                {isAlertsOpen && (
                  <div className="alerts-dropdown z-50 absolute right-0 top-full mt-2 shadow-lg">
                    <div className="flex justify-between items-center mb-2 px-2">
                      <h4 className="text-sm font-medium text-gray-900">{t('common.alerts')}</h4>
                      <button 
                        onClick={() => setIsAlertsOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {showNewSubsidyBadge && (
                        <Link to={newSubsidyLink} className="block no-underline">
                          <div className="p-2 bg-emerald-50 rounded-md text-xs">
                            <span className="font-medium text-emerald-700">{t('common.newSubsidyAvailable')}</span>
                            <span className="block text-emerald-600 mt-1 text-xs opacity-80">1 hour ago</span>
                          </div>
                        </Link>
                      )}
                      
                      {showDocumentsRequiredBadge && (
                        <Link to={`/farm/${farm.id}`} className="block no-underline">
                          <div className="p-2 bg-red-50 rounded-md text-xs">
                            <span className="font-medium text-red-700">{t('common.documentsRequired')}</span>
                            <span className="block text-red-600 mt-1 text-xs opacity-80">2 days ago</span>
                          </div>
                        </Link>
                      )}
                      
                      {showInReviewBadge && (
                        <Link to={`/farm/${farm.id}`} className="block no-underline">
                          <div className="p-2 bg-yellow-50 rounded-md text-xs">
                            <span className="font-medium text-yellow-700">{t('common.inReview')}</span>
                            <span className="block text-yellow-600 mt-1 text-xs opacity-80">3 days ago</span>
                          </div>
                        </Link>
                      )}
                      
                      {showReadyToSubmitBadge && (
                        <Link to={`/farm/${farm.id}`} className="block no-underline">
                          <div className="p-2 bg-green-50 rounded-md text-xs">
                            <span className="font-medium text-green-700">{t('common.readyToSubmit')}</span>
                            <span className="block text-green-600 mt-1 text-xs opacity-80">4 hours ago</span>
                          </div>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <StatusBadge status={farm.status} size="sm" />
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <CalendarDays size={14} className="mr-1 flex-shrink-0" />
          <span className="text-xs">{t('common.lastUpdated')}: {farm.updatedAt}</span>
        </div>
        
        <div className="mb-5">
          <p className="text-sm text-gray-600">{farm.region}</p>
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
                  className="tags-toggle flex items-center"
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
          <Button asChild variant="outline" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">
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
