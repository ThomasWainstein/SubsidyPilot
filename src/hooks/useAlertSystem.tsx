
import { useState, useEffect } from 'react';
import { useFarms } from './useFarms';

export interface Alert {
  id: string;
  type: 'deadline' | 'document' | 'compliance' | 'opportunity';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  farmId?: string;
  createdAt: Date;
  read: boolean;
}

export const useAlertSystem = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { data: farms } = useFarms();

  useEffect(() => {
    // Generate sample alerts based on farms
    if (farms && farms.length > 0) {
      const sampleAlerts: Alert[] = [
        {
          id: '1',
          type: 'deadline',
          title: 'Application Deadline Approaching',
          description: 'Your subsidy application deadline is in 7 days',
          priority: 'high',
          farmId: farms[0]?.id,
          createdAt: new Date(),
          read: false
        },
        {
          id: '2',
          type: 'document',
          title: 'Missing Documentation',
          description: 'Please upload required environmental permits',
          priority: 'medium',
          farmId: farms[0]?.id,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          read: false
        },
        {
          id: '3',
          type: 'opportunity',
          title: 'New Subsidy Available',
          description: 'A new sustainability subsidy matching your farm profile is available',
          priority: 'medium',
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
          read: true
        }
      ];
      
      setAlerts(sampleAlerts);
    }
  }, [farms]);

  const markAsRead = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;
  const highPriorityAlerts = alerts.filter(alert => alert.priority === 'high' && !alert.read);

  return {
    alerts,
    unreadCount,
    highPriorityAlerts,
    markAsRead,
    markAllAsRead,
    dismissAlert
  };
};
