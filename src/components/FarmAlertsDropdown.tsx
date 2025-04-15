
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

  // Check if dropdown would go off-screen and adjust position
  useEffect(() => {
    if (isOpen && alertsRef.current) {
      const rect = alertsRef.current.getBoundingClientRect();
      const parentRect = alertsRef.current.parentElement?.getBoundingClientRect() || new DOMRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Check horizontal position
      const dropdownWidth = 280; // Width of dropdown
      const willOverflowRight = (parentRect.right + dropdownWidth) > viewportWidth;
      
      // Check vertical position
      const dropdownHeight = rect.height;
      const willOverflowBottom = (parentRect.bottom + dropdownHeight) > viewportHeight;
      
      setPosition({
        right: !willOverflowRight,
        top: !willOverflowBottom
      });
    }
  }, [isOpen]);

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
      return 'left-0 top-full mt-2 w-full';
    }
    
    if (position.top && position.right) {
      return 'right-0 top-full mt-2';
    } else if (position.top && !position.right) {
      return 'left-0 top-full mt-2';
    } else if (!position.top && position.right) {
      return 'right-0 bottom-full mb-2';
    } else {
      return 'left-0 bottom-full mb-2';
    }
  };

  return (
    <div className="relative" ref={alertsRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-gray-600" />
        <div className={`absolute -top-2 -right-2 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full ${isNewAlert ? 'animate-pulse' : ''}`}>
          {alertCount}
        </div>
      </button>
      
      {isOpen && (
        <Card 
          className={`fixed sm:absolute ${getDropdownPositionClass()} z-[100] shadow-xl backdrop-blur-sm border-gray-100 animate-fade-in w-[280px] max-h-[400px] overflow-y-auto`}
          style={{ transform: 'translateY(0)', transition: 'opacity 0.2s ease-out, transform 0.2s ease-out' }}
        >
          <div className="flex justify-between items-center mb-2 px-3 pt-3">
            <h4 className="text-sm font-medium text-gray-900">{t('common.alerts')}</h4>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close alerts"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-2 p-3 pt-1">
            {showNewSubsidyBadge && (
              <Link to={newSubsidyLink} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-emerald-50 hover:bg-emerald-100 transition-colors rounded-md text-xs">
                  <span className="font-medium text-emerald-700 break-words whitespace-normal">{t('common.newSubsidyAvailable')}</span>
                  <span className="block text-emerald-600 mt-1 text-xs opacity-80">1 hour ago</span>
                </div>
              </Link>
            )}
            
            {showDocumentsRequiredBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-red-50 hover:bg-red-100 transition-colors rounded-md text-xs">
                  <span className="font-medium text-red-700 break-words whitespace-normal">{t('common.documentsRequired')}</span>
                  <span className="block text-red-600 mt-1 text-xs opacity-80">2 days ago</span>
                </div>
              </Link>
            )}
            
            {showInReviewBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-yellow-50 hover:bg-yellow-100 transition-colors rounded-md text-xs">
                  <span className="font-medium text-yellow-700 break-words whitespace-normal">{t('common.inReview')}</span>
                  <span className="block text-yellow-600 mt-1 text-xs opacity-80">3 days ago</span>
                </div>
              </Link>
            )}
            
            {showReadyToSubmitBadge && (
              <Link to={`/farm/${farmId}`} className="block no-underline" onClick={() => setIsOpen(false)}>
                <div className="p-3 bg-green-50 hover:bg-green-100 transition-colors rounded-md text-xs">
                  <span className="font-medium text-green-700 break-words whitespace-normal">{t('common.readyToSubmit')}</span>
                  <span className="block text-green-600 mt-1 text-xs opacity-80">4 hours ago</span>
                </div>
              </Link>
            )}

            {!showNewSubsidyBadge && !showDocumentsRequiredBadge && !showInReviewBadge && !showReadyToSubmitBadge && (
              <div className="p-3 bg-gray-50 rounded-md text-xs text-center">
                <span className="text-gray-600">{t('common.noAlerts')}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default FarmAlertsDropdown;
