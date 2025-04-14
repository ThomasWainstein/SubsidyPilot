
import { useState, useEffect } from 'react';
import { Farm } from '@/data/farms';

// Types for our alert system
interface Alert {
  id: string;
  farmId: string; 
  type: 'newSubsidy' | 'documentsMissing' | 'deadlineApproaching' | 'profileInReview' | 'botReminder';
  timestamp: Date;
  seen: boolean;
  relatedItemId?: string; // Subsidy ID or document ID etc.
}

// Demo farm alert configuration to simulate real system
export const useAlertSystem = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Initialize alerts on first load
  useEffect(() => {
    if (!isInitialized) {
      // Generate initial alerts based on farm IDs
      const initialAlerts: Alert[] = [];
      
      // Logic to generate alerts based on farm IDs (for demo purposes)
      for (let i = 1; i <= 5; i++) {
        const farmId = i.toString();
        
        // New subsidy alerts for farms 1, 3
        if (i % 3 === 0) {
          initialAlerts.push({
            id: `ns-${farmId}-${Date.now()}`,
            farmId,
            type: 'newSubsidy',
            timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in the last hour
            seen: false,
            relatedItemId: `subsidy-${Math.floor(Math.random() * 100)}`
          });
        }
        
        // Missing documents for farms 2, 5
        if (i % 5 === 0 || i % 2 === 0) {
          initialAlerts.push({
            id: `doc-${farmId}-${Date.now()}`,
            farmId,
            type: 'documentsMissing',
            timestamp: new Date(Date.now() - Math.random() * 7200000), // Random time in the last 2 hours
            seen: false
          });
        }
        
        // Deadline approaching for farm 4
        if (i % 4 === 0) {
          initialAlerts.push({
            id: `deadline-${farmId}-${Date.now()}`,
            farmId,
            type: 'deadlineApproaching',
            timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in the last day
            seen: false,
            relatedItemId: `deadline-${Math.floor(Math.random() * 100)}`
          });
        }
      }
      
      setAlerts(initialAlerts);
      setIsInitialized(true);
      
      // Set up the interval for periodic new alert generation
      const alertInterval = setInterval(() => {
        addRandomAlert();
      }, 1800000); // Every 30 minutes
      
      return () => clearInterval(alertInterval);
    }
  }, [isInitialized]);
  
  // Function to add a random alert for demo purposes
  const addRandomAlert = () => {
    const farmId = Math.floor(Math.random() * 5) + 1;
    const alertTypes = ['newSubsidy', 'documentsMissing', 'deadlineApproaching', 'profileInReview', 'botReminder'] as const;
    const randomType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    
    const newAlert: Alert = {
      id: `${randomType}-${farmId}-${Date.now()}`,
      farmId: farmId.toString(),
      type: randomType,
      timestamp: new Date(),
      seen: false,
      relatedItemId: randomType === 'newSubsidy' ? `subsidy-${Math.floor(Math.random() * 100)}` : undefined
    };
    
    setAlerts(prev => [...prev, newAlert]);
  };
  
  // Function to mark an alert as seen
  const markAlertAsSeen = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, seen: true } : alert
      )
    );
  };
  
  // Get alerts for a specific farm
  const getAlertsForFarm = (farmId: string) => {
    return alerts.filter(alert => alert.farmId === farmId);
  };
  
  // Check if a subsidy is new (created in the last hour)
  const isSubsidyNew = (subsidyId: string) => {
    const subsidy = alerts.find(
      alert => alert.type === 'newSubsidy' && alert.relatedItemId === subsidyId
    );
    
    if (!subsidy) return false;
    
    // Check if created within the last hour
    const now = new Date();
    const timeDiff = now.getTime() - subsidy.timestamp.getTime();
    return timeDiff < 3600000; // 1 hour in milliseconds
  };
  
  return {
    alerts,
    getAlertsForFarm,
    markAlertAsSeen,
    addRandomAlert,
    isSubsidyNew
  };
};
