
import React from 'react';
import FarmCard from '@/components/FarmCard';
import { Farm } from '@/data/farms';

interface FarmGridProps {
  farms: Farm[];
}

const FarmGrid = ({ farms }: FarmGridProps) => {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {farms.map(farm => (
        <FarmCard key={farm.id} farm={farm} />
      ))}
    </div>
  );
};

export default FarmGrid;
