
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface RegulatoryOverviewProps {
  farmId: string;
}

const RegulatoryOverview = ({ farmId }: RegulatoryOverviewProps) => {
  const { t } = useLanguage();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('farm.regulatoryOverview')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>{t('farm.capCompliance')}</span>
          <CheckCircle size={20} className="text-green-500" />
        </div>
        
        <div className="flex items-center justify-between">
          <span>{t('farm.emissionsScore')}</span>
          <span className="font-semibold">2.1 tCO₂e/ha</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span>{t('farm.ecoSchemeEligibility')}</span>
          <CheckCircle size={20} className="text-green-500" />
        </div>
      </CardContent>
    </Card>
  );
};

export default RegulatoryOverview;
