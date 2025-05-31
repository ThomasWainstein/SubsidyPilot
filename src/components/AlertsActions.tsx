
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Calendar, MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AlertsActions = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('updates');

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
    <Card className="shadow-sm border-gray-100 dark:border-gray-800">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">{t('dashboard.alertsAndActions')}</CardTitle>
          
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-[140px] h-8 text-xs border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updates" className="text-xs">
                <div className="flex items-center">
                  <Bell size={12} className="mr-1.5" />
                  <span>{t('dashboard.farmUpdateLog')}</span>
                </div>
              </SelectItem>
              <SelectItem value="deadlines" className="text-xs">
                <div className="flex items-center">
                  <Calendar size={12} className="mr-1.5" />
                  <span>{t('dashboard.upcomingDeadlines')}</span>
                </div>
              </SelectItem>
              <SelectItem value="reminders" className="text-xs">
                <div className="flex items-center">
                  <MessageSquare size={12} className="mr-1.5" />
                  <span>{t('dashboard.reminders')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'updates' && (
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {farmUpdates.slice(0, 3).map(update => (
              <Link 
                key={update.id} 
                to={`/farm/${update.farmId}`}
                className="block no-underline"
              >
                <div className="alert-card hover:bg-gray-50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium text-gray-900">{update.farm}</p>
                  <p className="text-sm text-gray-700">{update.action}</p>
                  <p className="text-xs text-gray-500 mt-1">{update.timestamp}</p>
                </div>
              </Link>
            ))}
            
            {farmUpdates.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500">
                See All Updates <ChevronRight size={12} className="ml-1" />
              </Button>
            )}
          </div>
        )}
        
        {activeTab === 'deadlines' && (
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {upcomingDeadlines.slice(0, 3).map(deadline => (
              <Link 
                key={deadline.id} 
                to={`/farm/${deadline.farmId}`}
                className="block no-underline"
              >
                <div className="alert-card hover:bg-gray-50 cursor-pointer transition-colors">
                  <p className="text-sm font-medium text-gray-900">{deadline.name}</p>
                  <div className="flex items-center mt-3">
                    <div className={`h-1.5 rounded-full flex-grow ${
                      deadline.daysLeft < 20 ? 'bg-red-100' : 
                      deadline.daysLeft < 30 ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <div className={`h-1.5 rounded-full ${
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
            
            {upcomingDeadlines.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500">
                See All Deadlines <ChevronRight size={12} className="ml-1" />
              </Button>
            )}
          </div>
        )}
        
        {activeTab === 'reminders' && (
          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
            {reminders.slice(0, 3).map(reminder => (
              <Link 
                key={reminder.id} 
                to={`/farm/${reminder.farmId}`}
                className="block no-underline"
              >
                <div className="alert-card hover:bg-gray-50 cursor-pointer transition-colors">
                  <p className="text-sm text-gray-800">{reminder.message}</p>
                </div>
              </Link>
            ))}
            
            {reminders.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500">
                See All Reminders <ChevronRight size={12} className="ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertsActions;
