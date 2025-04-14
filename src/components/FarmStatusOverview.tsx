
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, AlertOctagon, Clock } from 'lucide-react';

interface StatusCount {
  status: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const FarmStatusOverview = () => {
  const { t } = useLanguage();

  // Example status counts (in a real app, this would be calculated from actual farm data)
  const statusCounts: StatusCount[] = [
    { 
      status: 'status.profileComplete', 
      count: 3, 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      status: 'status.inReview', 
      count: 1, 
      icon: Clock, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    { 
      status: 'status.needsUpdate', 
      count: 1, 
      icon: AlertOctagon, 
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    { 
      status: 'status.subsidyInProgress', 
      count: 2, 
      icon: AlertTriangle, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('dashboard.statusBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusCounts.map((item, index) => {
          const Icon = item.icon;
          return (
            <div 
              key={index} 
              className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className={`w-8 h-8 rounded-full ${item.bgColor} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{t(item.status)}</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xs font-semibold">{item.count}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default FarmStatusOverview;
