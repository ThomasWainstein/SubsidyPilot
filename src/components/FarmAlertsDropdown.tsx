
import { Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { useRef, useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '@/components/ui/card';

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
  const isMobile = useIsMobile();
  const [position, setPosition] = useState({ top: true, right: true });
  
  // Auto-close dropdown after 10 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      timer = setTimeout(() => {
        setIsOpen(false);
      }, 10000); // 10 seconds
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, setIsOpen]);

  // Check position on mount and resize
  useEffect(() => {
    const checkPosition = () => {
      if (isOpen && alertsRef.current) {
        const rect = alertsRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Width of the dropdown
        const dropdownWidth = 280;
        
        // Estimate the dropdown height (it can vary)
        const dropdownHeight = 300;
        
        const willOverflowRight = (rect.right + dropdownWidth - 40) > viewportWidth;
        const willOverflowBottom = (rect.bottom + dropdownHeight) > viewportHeight;
        
        setPosition({
          right: !willOverflowRight,
          top: !willOverflowBottom
        });
      }
    };
    
    checkPosition();
    
    window.addEventListener('resize', checkPosition);
    return () => {
      window.removeEventListener('resize', checkPosition);
    };
  }, [isOpen]);

  // Handle clicks outside to close dropdown
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

  const getDropdownPositionClass = () => {
    if (isMobile) {
      return 'fixed left-4 right-4 top-20';
    }
    
    if (position.top && position.right) {
      return 'absolute right-0 top-full mt-2';
    } else if (position.top && !position.right) {
      return 'absolute left-0 top-full mt-2';
    } else if (!position.top && position.right) {
      return 'absolute right-0 bottom-full mb-2';
    } else {
      return 'absolute left-0 bottom-full mb-2';
    }
  };

  return (
    <div className="relative" ref={alertsRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-gray-600 dark:text-gray-300" />
        {alertCount > 0 && (
          <div className={`absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 bg-red-500 dark:bg-red-600 text-white text-xs font-bold rounded-full ${isNewAlert ? 'animate-pulse' : ''}`}>
            {alertCount}
          </div>
        )}
      </button>
      
      {isOpen && (
        <Card 
          className={`${getDropdownPositionClass()} z-50 shadow-xl backdrop-blur-sm border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 w-[280px] max-h-[400px] overflow-y-auto dark:bg-slate-800 dark:text-white transition-all duration-200`}
        >
          <div className="flex justify-between items-center mb-2 px-3 pt-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t('common.alerts')}</h4>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close alerts"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-2 p-3 pt-1">
            {showNewSubsidyBadge && (
              <Link to={newSubsidyLink} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 transition-colors rounded-md text-xs">
                  <span className="font-medium text-emerald-700 dark:text-emerald-300 break-words whitespace-normal block">{t('common.newSubsidyAvailable')}</span>
                  <span className="block text-emerald-600 dark:text-emerald-400 mt-1 text-xs opacity-80">1 hour ago</span>
                </div>
              </Link>
            )}
            
            {showDocumentsRequiredBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors rounded-md text-xs">
                  <span className="font-medium text-red-700 dark:text-red-300 break-words whitespace-normal block">{t('common.documentsRequired')}</span>
                  <span className="block text-red-600 dark:text-red-400 mt-1 text-xs opacity-80">2 days ago</span>
                </div>
              </Link>
            )}
            
            {showInReviewBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 transition-colors rounded-md text-xs">
                  <span className="font-medium text-yellow-700 dark:text-yellow-300 break-words whitespace-normal block">{t('common.inReview')}</span>
                  <span className="block text-yellow-600 dark:text-yellow-400 mt-1 text-xs opacity-80">3 days ago</span>
                </div>
              </Link>
            )}
            
            {showReadyToSubmitBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 transition-colors rounded-md text-xs">
                  <span className="font-medium text-green-700 dark:text-green-300 break-words whitespace-normal block">{t('common.readyToSubmit')}</span>
                  <span className="block text-green-600 dark:text-green-400 mt-1 text-xs opacity-80">4 hours ago</span>
                </div>
              </Link>
            )}

            {!showNewSubsidyBadge && !showDocumentsRequiredBadge && !showInReviewBadge && !showReadyToSubmitBadge && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md text-xs text-center">
                <span className="text-gray-600 dark:text-gray-300">{t('common.noAlerts')}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default FarmAlertsDropdown;
