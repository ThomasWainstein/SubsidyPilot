
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart, Bell, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConsultantMetrics = () => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const metrics = {
    totalFarms: 7,
    totalSubmissions: 14,
    averageMatchScore: '82%',
    farmsInReview: 2,
    newSubsidyMatches: 5,
    pendingDocuments: 3,
    mostActiveRegion: 'Nouvelle-Aquitaine'
  };

  return (
    <Card className="shadow-sm border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{t('dashboard.metrics')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary KPIs - Always visible */}
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
            <Users size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('dashboard.totalFarms')}</p>
            <p className="text-lg font-medium">{metrics.totalFarms}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mr-3">
            <Bell size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('dashboard.newSubsidyMatches')}</p>
            <p className="text-lg font-medium">{metrics.newSubsidyMatches}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mr-3">
            <BarChart size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('dashboard.averageMatchScore')}</p>
            <p className="text-lg font-medium">{metrics.averageMatchScore}</p>
          </div>
        </div>
        
        {/* Additional metrics - Only visible when expanded */}
        {isExpanded && (
          <>
            <div className="flex items-center pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center mr-3">
                <MapPin size={16} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('dashboard.mostActiveRegion')}</p>
                <p className="text-lg font-medium">{metrics.mostActiveRegion}</p>
              </div>
            </div>
          </>
        )}
        
        {/* Toggle button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-xs text-gray-500 mt-2" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <><ChevronUp size={14} className="mr-1" /> Show Less</>
          ) : (
            <><ChevronDown size={14} className="mr-1" /> More Insights</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConsultantMetrics;
