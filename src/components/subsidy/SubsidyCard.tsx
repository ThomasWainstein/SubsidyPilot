
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Globe, Hash, DollarSign, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import FarmCardApplyButton from '@/components/FarmCardApplyButton';
import { Subsidy } from '@/types/subsidy';

interface SubsidyCardProps {
  subsidy: Subsidy;
  farmId: string;
}

export const SubsidyCard: React.FC<SubsidyCardProps> = ({ subsidy, farmId }) => {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors dark:bg-dark-card">
      <CardHeader className="bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg dark:text-white">{subsidy.name}</CardTitle>
          {subsidy.isManuallyAdded && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              {t('common.manuallyAdded')}
            </Badge>
          )}
        </div>
        <CardDescription className="dark:text-gray-300">{subsidy.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center">
            <Percent size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">{t('subsidies.matchConfidence')}:</span>
            <div className="flex items-center gap-2 ml-auto">
              <Progress value={subsidy.matchConfidence} className="h-2 w-24" />
              <span className="text-sm font-medium dark:text-white">{subsidy.matchConfidence}%</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <Clock size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.deadline')}:</span>
            <span className="text-sm font-medium ml-auto dark:text-white">{subsidy.deadline}</span>
          </div>
          
          <div className="flex items-center">
            <Globe size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.regionEligibility')}:</span>
            <span className="text-sm font-medium ml-auto dark:text-white">
              {Array.isArray(subsidy.region) ? subsidy.region.join(', ') : subsidy.region}
            </span>
          </div>
          
          <div className="flex items-center">
            <Hash size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.grantCode')}:</span>
            <span className="text-sm font-medium ml-auto dark:text-white">{subsidy.code}</span>
          </div>
          
          <div className="flex items-center">
            <DollarSign size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.maxGrant')}:</span>
            <span className="text-sm font-medium ml-auto dark:text-white">{subsidy.grant}</span>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <FarmCardApplyButton farmId={farmId} subsidyId={subsidy.id}>
            {t('common.applyNow')}
          </FarmCardApplyButton>
        </div>
      </CardContent>
    </Card>
  );
};
