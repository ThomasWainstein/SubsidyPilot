
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import { Subsidy, getRandomSubsidies } from '@/data/subsidies';
import { farms } from '@/data/farms';
import { SubsidyCard } from '@/components/subsidy/SubsidyCard';
import { AddSubsidyDialog } from '@/components/subsidy/AddSubsidyDialog';

interface SubsidiesTabContentProps {
  farmId: string;
}

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
  const { t } = useLanguage();
  const [farmSubsidies, setFarmSubsidies] = useState(getRandomSubsidies(farmId));
  const [isAddSubsidyOpen, setIsAddSubsidyOpen] = useState(false);
  
  const farm = farms.find(f => f.id === farmId);
  
  const getFarmCountry = () => {
    if (!farm?.region) return "France";
    if (farm.region.includes(',')) {
      const parts = farm.region.split(",");
      return parts.length > 1 ? parts[1].trim() : "France";
    }
    return "France";
  };
  
  let matchedSubsidies = farmSubsidies.filter(subsidy => {
    const farmCountry = getFarmCountry();
    
    if (Array.isArray(subsidy.region)) {
      return subsidy.region.some(r => r.includes(farmCountry));
    }
    
    return subsidy.region.includes(farmCountry) || subsidy.region === "EU-wide";
  });

  const handleAddSubsidy = (newSubsidy: Subsidy) => {
    setFarmSubsidies([...farmSubsidies, newSubsidy]);
    setIsAddSubsidyOpen(false);
  };

  React.useEffect(() => {
    matchedSubsidies = farmSubsidies.filter(subsidy => {
      const farmCountry = getFarmCountry();
      
      if (Array.isArray(subsidy.region)) {
        return subsidy.region.some(r => r.includes(farmCountry));
      }
      
      return subsidy.region.includes(farmCountry) || subsidy.region === "EU-wide";
    });
  }, [farmSubsidies]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('subsidies.title')}</CardTitle>
          <CardDescription>{t('subsidies.subtitle')}</CardDescription>
        </div>
        <DialogTrigger asChild>
          <Button className="gap-1" onClick={() => setIsAddSubsidyOpen(true)}>
            <Plus size={16} />
            {t('common.addSubsidy')}
          </Button>
        </DialogTrigger>
      </CardHeader>
      <CardContent>
        {matchedSubsidies.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {matchedSubsidies.map((subsidy) => (
              <SubsidyCard key={subsidy.id} subsidy={subsidy} farmId={farmId} />
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
      
      <AddSubsidyDialog 
        isOpen={isAddSubsidyOpen}
        onClose={() => setIsAddSubsidyOpen(false)}
        onAddSubsidy={handleAddSubsidy}
      />
    </Card>
  );
};
