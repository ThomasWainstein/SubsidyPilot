
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FarmCalendarSectionProps {
  farmId: string;
  farmName: string;
}

const FarmCalendarSection: React.FC<FarmCalendarSectionProps> = ({ farmId, farmName }) => {
  const { t } = useLanguage();

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2">
        <CardTitle>Farm Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar Feature Coming Soon</h3>
          <p className="text-gray-600 mb-4">
            Track important dates, deadlines, and activities for {farmName}
          </p>
          <p className="text-sm text-gray-500">
            This feature will be available in a future update.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmCalendarSection;
