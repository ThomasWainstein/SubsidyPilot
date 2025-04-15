
import { Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { useRef, useEffect } from 'react';

interface FarmAlertsDropdownProps {
  farmId: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  showNewSubsidyBadge: boolean;
  showDocumentsRequiredBadge: boolean;
  showInReviewBadge: boolean;
  showReadyToSubmitBadge: boolean;
  alertCount: number;
  isNewAlert: boolean;
  newSubsidyLink: string;
}

const FarmAlertsDropdown = ({
  farmId,
  isOpen,
  setIsOpen,
  showNewSubsidyBadge,
  showDocumentsRequiredBadge,
  showInReviewBadge,
  showReadyToSubmitBadge,
  alertCount,
  isNewAlert,
  newSubsidyLink
}: FarmAlertsDropdownProps) => {
  const { t } = useLanguage();
  const alertsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  return (
    <div className="relative" ref={alertsRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Bell size={18} className="text-gray-600" />
        <div className={`absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full ${isNewAlert ? 'animate-pulse' : ''}`}>
          {alertCount}
        </div>
      </button>
      
      {isOpen && (
        <div className="alerts-dropdown z-50 absolute right-0 top-full mt-2 shadow-lg">
          <div className="flex justify-between items-center mb-2 px-2">
            <h4 className="text-sm font-medium text-gray-900">{t('common.alerts')}</h4>
            <button 
              onClick={() => setIsOpen(false)}
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
              <Link to={`/farm/${farmId}`} className="block no-underline">
                <div className="p-2 bg-red-50 rounded-md text-xs">
                  <span className="font-medium text-red-700">{t('common.documentsRequired')}</span>
                  <span className="block text-red-600 mt-1 text-xs opacity-80">2 days ago</span>
                </div>
              </Link>
            )}
            
            {showInReviewBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline">
                <div className="p-2 bg-yellow-50 rounded-md text-xs">
                  <span className="font-medium text-yellow-700">{t('common.inReview')}</span>
                  <span className="block text-yellow-600 mt-1 text-xs opacity-80">3 days ago</span>
                </div>
              </Link>
            )}
            
            {showReadyToSubmitBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline">
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
  );
};

export default FarmAlertsDropdown;
