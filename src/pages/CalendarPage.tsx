
import React from 'react';
import Navbar from '@/components/Navbar';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CalendarPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Calendar
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your farm calendar and important dates
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar Feature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Calendar Coming Soon</h3>
              <p className="text-gray-600">
                The calendar feature will be available in a future update. 
                This will help you track important farming dates, subsidy deadlines, and compliance requirements.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CalendarPage;
