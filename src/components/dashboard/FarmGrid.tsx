
import React, { useEffect } from 'react';
import FarmCard from '@/components/FarmCard';
import { Farm } from '@/data/farms';
import { useAlertSystem } from '@/hooks/useAlertSystem';

interface FarmGridProps {
  farms: Farm[];
}

const FarmGrid = ({ farms }: FarmGridProps) => {
  const alertSystem = useAlertSystem();
  
  // Demo: Add a random alert after component mounts
  useEffect(() => {
    // Simulate a new alert coming in after 15 seconds
    const timer = setTimeout(() => {
      alertSystem.addRandomAlert();
    }, 15000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {farms.map(farm => (
        <FarmCard key={farm.id} farm={farm} />
      ))}
    </div>
  );
};

export default FarmGrid;
