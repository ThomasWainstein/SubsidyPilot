
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getRandomSubsidies } from '@/data/subsidies';
import FarmCardApplyButton from '@/components/FarmCardApplyButton';
import { BarChart4, Clock, DollarSign, Globe, Hash, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SubsidiesTabContentProps {
  farmId: string;
}

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
  const { t } = useLanguage();
  const farmSubsidies = getRandomSubsidies(farmId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subsidies.title')}</CardTitle>
        <CardDescription>{t('subsidies.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {farmSubsidies.map((subsidy) => (
            <Card key={subsidy.id} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg">{subsidy.name}</CardTitle>
                <CardDescription>{subsidy.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Percent size={16} className="mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700 mr-2">{t('subsidies.matchConfidence')}:</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <Progress value={subsidy.matchConfidence} className="h-2 w-24" />
                      <span className="text-sm font-medium">{subsidy.matchConfidence}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock size={16} className="mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">{t('subsidies.deadline')}:</span>
                    <span className="text-sm font-medium ml-auto">{subsidy.deadline}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Globe size={16} className="mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">{t('subsidies.regionEligibility')}:</span>
                    <span className="text-sm font-medium ml-auto">{subsidy.region}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Hash size={16} className="mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">{t('subsidies.grantCode')}:</span>
                    <span className="text-sm font-medium ml-auto">{subsidy.code}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">{t('subsidies.maxGrant')}:</span>
                    <span className="text-sm font-medium ml-auto">{subsidy.grant}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <FarmCardApplyButton farmId={farmId} subsidyId={subsidy.id}>
                    {t('common.applyNow')}
                  </FarmCardApplyButton>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
