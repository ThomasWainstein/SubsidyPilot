
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Globe, Clock, DollarSign, Hash } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Subsidy } from '@/types/subsidy';

interface ImportSubsidyFormProps {
  onAddSubsidy: (subsidy: Subsidy) => void;
}

export const ImportSubsidyForm: React.FC<ImportSubsidyFormProps> = ({ onAddSubsidy }) => {
  const { t } = useLanguage();
  const [urlValue, setUrlValue] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedSubsidy, setFetchedSubsidy] = useState<Subsidy | null>(null);

  const handleFetchSubsidy = () => {
    if (!urlValue) return;
    
    setIsFetching(true);
    
    setTimeout(() => {
      const mockSubsidy: Subsidy = {
        id: uuidv4(),
        name: "Green Infrastructure Grant",
        description: "Financial support for implementing green infrastructure projects on farms to enhance sustainability and reduce environmental impact.",
        region: "France",
        deadline: "2025-06-30",
        grant: "Up to €75,000",
        matchConfidence: 92,
        code: `EU-GRN-${Math.floor(1000 + Math.random() * 9000)}`,
        documentsRequired: ["Sustainability Plan", "Financial Statement", "Farm Certification"],
        isManuallyAdded: true
      };
      
      setFetchedSubsidy(mockSubsidy);
      setIsFetching(false);
    }, 1500);
  };

  const handleSaveSubsidy = () => {
    if (fetchedSubsidy) {
      onAddSubsidy(fetchedSubsidy);
      setFetchedSubsidy(null);
      setUrlValue('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subsidy-url">{t('common.subsidySourceUrl')}</Label>
        <Input 
          id="subsidy-url" 
          placeholder="https://ec.europa.eu/subsidies/..." 
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
        />
      </div>
      
      <Button 
        onClick={handleFetchSubsidy} 
        disabled={isFetching || !urlValue}
        className="gap-1"
      >
        {isFetching ? t('common.fetchingSubsidyData') : t('common.fetchDetails')}
      </Button>
      
      {fetchedSubsidy && (
        <div className="mt-4 border rounded-md p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{fetchedSubsidy.name}</h3>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              {t('common.manuallyAdded')}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{fetchedSubsidy.description}</p>
          <div className="text-sm grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <Globe size={14} className="text-gray-500" />
              <span>{fetchedSubsidy.region}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} className="text-gray-500" />
              <span>{fetchedSubsidy.deadline}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign size={14} className="text-gray-500" />
              <span>{fetchedSubsidy.grant}</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash size={14} className="text-gray-500" />
              <span>{fetchedSubsidy.code}</span>
            </div>
          </div>
          
          <div className="mt-2">
            <p className="text-sm font-medium mb-1">{t('common.documentsRequired')}:</p>
            <ul className="text-sm list-disc pl-5">
              {fetchedSubsidy.documentsRequired?.map((doc: string, index: number) => (
                <li key={index}>{doc}</li>
              ))}
            </ul>
          </div>
          
          <Button onClick={handleSaveSubsidy} className="w-full mt-4">
            {t('common.saveToFarm')}
          </Button>
        </div>
      )}
    </div>
  );
};
