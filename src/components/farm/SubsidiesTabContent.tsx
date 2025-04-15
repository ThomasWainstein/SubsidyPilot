
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Clock, Globe, Hash, DollarSign, Percent } from 'lucide-react';
import { getRandomSubsidies } from '@/data/subsidies';
import { farms } from '@/data/farms';
import { Progress } from '@/components/ui/progress';
import FarmCardApplyButton from '@/components/FarmCardApplyButton';

interface SubsidiesTabContentProps {
  farmId: string;
}

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
  const { t } = useLanguage();
  const farmSubsidies = getRandomSubsidies(farmId);
  const farm = farms.find(f => f.id === farmId);
  
  const getFarmCountry = () => {
    if (!farm?.region) return "France";
    // If region already contains country (e.g., "Bayern, Germany"), extract it
    if (farm.region.includes(',')) {
      const parts = farm.region.split(",");
      return parts.length > 1 ? parts[1].trim() : "France";
    }
    // Default to France for French regions without explicit country
    return "France";
  };
  
  let matchedSubsidies = farmSubsidies.filter(subsidy => {
    const farmCountry = getFarmCountry();
    
    // Handle both string and array region fields
    if (Array.isArray(subsidy.region)) {
      return subsidy.region.some(r => r.includes(farmCountry));
    }
    
    return subsidy.region.includes(farmCountry) || subsidy.region === "EU-wide";
  });

  // Removed the special case for "EcoHof Reinhardt" to ensure all farms show subsidies

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subsidies.title')}</CardTitle>
        <CardDescription>{t('subsidies.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {matchedSubsidies.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {matchedSubsidies.map((subsidy) => (
              <Card key={subsidy.id} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors dark:bg-dark-card">
                <CardHeader className="bg-gray-50 dark:bg-gray-800">
                  <CardTitle className="text-lg dark:text-white">{subsidy.name}</CardTitle>
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
                      <span className="text-sm font-medium ml-auto dark:text-white">{subsidy.region}</span>
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
            ))}
          </div>
        ) : (
          <div className="p-6 border rounded-lg border-dashed text-center bg-gray-50 dark:bg-gray-800">
            <AlertTriangle className="mx-auto mb-3 text-amber-500 h-8 w-8" />
            <h3 className="text-lg font-medium mb-2 dark:text-white">{t('common.noSubsidiesFound')}</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('common.noSubsidiesFoundDesc')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
