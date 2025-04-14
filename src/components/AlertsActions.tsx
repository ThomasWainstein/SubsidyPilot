
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Calendar, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AlertsActions = () => {
  const { t } = useLanguage();

  // Example data (in a real app this would come from actual farm data)
  const farmUpdates = [
    { id: 1, farm: 'Ferme TechAgro', action: 'uploaded Carbon Score Form', timestamp: '2 hours ago' },
    { id: 2, farm: 'EcoHof Reinhardt', action: 'New Match - Soil Health Grant', timestamp: '1 day ago' },
    { id: 3, farm: 'La Granja Andina', action: 'completed profile', timestamp: '2 days ago' }
  ];

  const upcomingDeadlines = [
    { id: 1, name: 'Smart Irrigation Upgrade', daysLeft: 19 },
    { id: 2, name: 'Organic Transition Grant', daysLeft: 26 },
    { id: 3, name: 'Soil Analysis Subsidy', daysLeft: 34 }
  ];

  const reminders = [
    { id: 1, message: 'Client Domaine du Sureau needs to update revenue details before April 20.' },
    { id: 2, message: 'Verify TechAgro\'s certification status for new subsidy eligibility.' },
    { id: 3, message: 'Follow up with Ecofarm on pending document uploads.' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.alertsAndActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="updates" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="updates" className="flex items-center gap-1">
              <Bell size={14} />
              <span className="hidden sm:inline">{t('dashboard.farmUpdateLog')}</span>
            </TabsTrigger>
            <TabsTrigger value="deadlines" className="flex items-center gap-1">
              <Calendar size={14} />
              <span className="hidden sm:inline">{t('dashboard.upcomingDeadlines')}</span>
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex items-center gap-1">
              <MessageSquare size={14} />
              <span className="hidden sm:inline">{t('dashboard.reminders')}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="updates" className="mt-0">
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {farmUpdates.map(update => (
                <div key={update.id} className="p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">{update.farm}</p>
                  <p className="text-xs text-gray-600">{update.action}</p>
                  <p className="text-xs text-gray-400 mt-1">{update.timestamp}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="deadlines" className="mt-0">
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {upcomingDeadlines.map(deadline => (
                <div key={deadline.id} className="p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                  <p className="text-sm font-medium">{deadline.name}</p>
                  <div className="flex items-center mt-1">
                    <div className={`h-2 rounded-full flex-grow ${
                      deadline.daysLeft < 20 ? 'bg-red-200' : 
                      deadline.daysLeft < 30 ? 'bg-yellow-200' : 'bg-green-200'
                    }`}>
                      <div className={`h-2 rounded-full ${
                        deadline.daysLeft < 20 ? 'bg-red-500' : 
                        deadline.daysLeft < 30 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} style={{ width: `${Math.min(100, 100 - (deadline.daysLeft * 2))}%` }}></div>
                    </div>
                    <span className="text-xs ml-2 font-medium">
                      {deadline.daysLeft} {t('dashboard.daysLeft')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="reminders" className="mt-0">
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {reminders.map(reminder => (
                <div key={reminder.id} className="p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                  <p className="text-sm">{reminder.message}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AlertsActions;
