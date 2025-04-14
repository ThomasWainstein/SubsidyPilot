
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Map } from 'lucide-react';

interface RegionCount {
  region: string;
  count: number;
  flag: string;
}

const RegionOverview = () => {
  const { t } = useLanguage();

  // Example region counts (in a real app, this would be calculated from actual farm data)
  const regionCounts: RegionCount[] = [
    { region: 'France', count: 4, flag: '🇫🇷' },
    { region: 'Germany', count: 1, flag: '🇩🇪' },
    { region: 'Spain', count: 1, flag: '🇪🇸' },
    { region: 'Romania', count: 1, flag: '🇷🇴' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.regionSummary')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-3">
          <Map className="mr-2 h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            You're managing farms in:
          </span>
        </div>
        <div className="space-y-2">
          {regionCounts.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center">
                <span className="text-xl mr-2">{item.flag}</span>
                <span className="text-sm font-medium">{item.region}</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-semibold">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RegionOverview;
