
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, BarChart } from 'lucide-react';

const ConsultantMetrics = () => {
  const { t } = useLanguage();
  
  const metrics = {
    totalFarms: 7,
    totalSubmissions: 14,
    averageMatchScore: '82%'
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
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
            <FileText size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('dashboard.totalSubmissions')}</p>
            <p className="text-xl font-semibold">{metrics.totalSubmissions}</p>
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
      </CardContent>
    </Card>
  );
};

export default ConsultantMetrics;
