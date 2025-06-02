
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';

interface Deadline {
  id: string;
  title: string;
  date: string;
  type: 'subsidy' | 'regulation' | 'application';
  urgency: 'high' | 'medium' | 'low';
}

const DashboardUpcomingDeadlines = () => {
  // Mock data for now - in a real app this would come from the database
  const upcomingDeadlines: Deadline[] = [
    {
      id: '1',
      title: 'CAP Payment Application',
      date: '2024-12-15',
      type: 'subsidy',
      urgency: 'high'
    },
    {
      id: '2',
      title: 'Environmental Compliance Report',
      date: '2024-12-20',
      type: 'regulation',
      urgency: 'medium'
    },
    {
      id: '3',
      title: 'Organic Certification Renewal',
      date: '2024-12-30',
      type: 'application',
      urgency: 'low'
    }
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getDaysUntil = (dateString: string) => {
    const deadline = new Date(dateString);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingDeadlines.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No upcoming deadlines</p>
        ) : (
          <div className="space-y-3">
            {upcomingDeadlines.map(deadline => {
              const daysUntil = getDaysUntil(deadline.date);
              return (
                <div key={deadline.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{deadline.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(deadline.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {daysUntil <= 7 && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                    <Badge variant={getUrgencyColor(deadline.urgency)}>
                      {daysUntil > 0 ? `${daysUntil} days` : 'Overdue'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardUpcomingDeadlines;
