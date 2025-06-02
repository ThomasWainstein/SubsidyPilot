
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardCalendarWidget = () => {
  const navigate = useNavigate();
  const today = new Date();
  
  // Mock upcoming events
  const upcomingEvents = [
    {
      id: '1',
      title: 'Harvest Planning Meeting',
      date: '2024-12-10',
      time: '14:00'
    },
    {
      id: '2',
      title: 'Soil Testing',
      date: '2024-12-12',
      time: '09:00'
    },
    {
      id: '3',
      title: 'Equipment Maintenance',
      date: '2024-12-15',
      time: '10:30'
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
          View All
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{today.getDate()}</div>
            <div className="text-sm text-muted-foreground">
              {today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Upcoming Events</h4>
            {upcomingEvents.slice(0, 3).map(event => (
              <div key={event.id} className="flex justify-between items-center text-sm">
                <div>
                  <div className="font-medium">{event.title}</div>
                  <div className="text-muted-foreground">
                    {new Date(event.date).toLocaleDateString()} at {event.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCalendarWidget;
