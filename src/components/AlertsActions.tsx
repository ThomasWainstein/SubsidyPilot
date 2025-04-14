
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Calendar, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const AlertsActions = () => {
  const { t } = useLanguage();

  // Example data (in a real app this would come from actual farm data)
  const farmUpdates = [
    { id: 1, farmId: '3', farm: 'Ferme TechAgro', action: 'uploaded Carbon Score Form', timestamp: '2 hours ago' },
    { id: 2, farmId: '1', farm: 'EcoHof Reinhardt', action: 'New Match - Soil Health Grant', timestamp: '1 day ago' },
    { id: 3, farmId: '2', farm: 'La Granja Andina', action: 'completed profile', timestamp: '2 days ago' }
  ];

  const upcomingDeadlines = [
    { id: 1, farmId: '2', name: 'Smart Irrigation Upgrade', daysLeft: 19 },
    { id: 2, farmId: '4', name: 'Organic Transition Grant', daysLeft: 26 },
    { id: 3, farmId: '1', name: 'Soil Analysis Subsidy', daysLeft: 34 }
  ];

  const reminders = [
    { id: 1, farmId: '5', message: 'Client Domaine du Sureau needs to update revenue details before April 20.' },
    { id: 2, farmId: '3', message: 'Verify TechAgro\'s certification status for new subsidy eligibility.' },
    { id: 3, farmId: '2', message: 'Follow up with Ecofarm on pending document uploads.' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.alertsAndActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="updates" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 bg-gray-100 p-1 gap-1">
            <TabsTrigger 
              value="updates" 
              className={cn(
                "flex items-center gap-1 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              )}
            >
              <Bell size={14} />
              <span>{t('dashboard.farmUpdateLog')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="deadlines" 
              className={cn(
                "flex items-center gap-1 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              )}
            >
              <Calendar size={14} />
              <span>{t('dashboard.upcomingDeadlines')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reminders" 
              className={cn(
                "flex items-center gap-1 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              )}
            >
              <MessageSquare size={14} />
              <span>{t('dashboard.reminders')}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="updates" className="mt-0">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {farmUpdates.map(update => (
                <Link 
                  key={update.id} 
                  to={`/farm/${update.farmId}`}
                  className="block no-underline"
                >
                  <div className="alert-card p-3 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{update.farm}</p>
                    <p className="text-sm text-gray-700">{update.action}</p>
                    <p className="text-xs text-gray-500 mt-1">{update.timestamp}</p>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="deadlines" className="mt-0">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {upcomingDeadlines.map(deadline => (
                <Link 
                  key={deadline.id} 
                  to={`/farm/${deadline.farmId}`}
                  className="block no-underline"
                >
                  <div className="alert-card p-3 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{deadline.name}</p>
                    <div className="flex items-center mt-2">
                      <div className={`h-2 rounded-full flex-grow ${
                        deadline.daysLeft < 20 ? 'bg-red-200' : 
                        deadline.daysLeft < 30 ? 'bg-yellow-200' : 'bg-green-200'
                      }`}>
                        <div className={`h-2 rounded-full ${
                          deadline.daysLeft < 20 ? 'bg-red-500' : 
                          deadline.daysLeft < 30 ? 'bg-yellow-500' : 'bg-green-500'
                        }`} style={{ width: `${Math.min(100, 100 - (deadline.daysLeft * 2))}%` }}></div>
                      </div>
                      <span className="text-xs ml-2 font-medium text-gray-700">
                        {deadline.daysLeft} {t('dashboard.daysLeft')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="reminders" className="mt-0">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {reminders.map(reminder => (
                <Link 
                  key={reminder.id} 
                  to={`/farm/${reminder.farmId}`}
                  className="block no-underline"
                >
                  <div className="alert-card p-3 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200">
                    <p className="text-sm text-gray-900">{reminder.message}</p>
                  </div>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AlertsActions;
