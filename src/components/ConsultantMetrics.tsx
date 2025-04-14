
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, BarChart, AlertTriangle, Bell, FileWarning, MapPin } from 'lucide-react';

const ConsultantMetrics = () => {
  const { t } = useLanguage();
  
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.metrics')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.totalFarms')}</p>
            <p className="text-xl font-semibold">{metrics.totalFarms}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
            <AlertTriangle size={20} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.farmsInReview')}</p>
            <p className="text-xl font-semibold">{metrics.farmsInReview}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
            <Bell size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.newSubsidyMatches')}</p>
            <p className="text-xl font-semibold">{metrics.newSubsidyMatches}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
            <FileWarning size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.pendingDocuments')}</p>
            <p className="text-xl font-semibold">{metrics.pendingDocuments}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
            <BarChart size={20} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.averageMatchScore')}</p>
            <p className="text-xl font-semibold">{metrics.averageMatchScore}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
            <MapPin size={20} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.mostActiveRegion')}</p>
            <p className="text-xl font-semibold">{metrics.mostActiveRegion}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsultantMetrics;
