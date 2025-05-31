
import React from 'react';
import FarmCard from '@/components/FarmCard';

interface Farm {
  id: string;
  name: string;
  address: string;
  department: string | null;
  total_hectares: number | null;
  created_at: string;
  updated_at: string;
  status?: string;
  region?: string;
  tags?: string[];
}

interface FarmGridProps {
  farms: Farm[];
}

const FarmGrid = ({ farms }: FarmGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {farms.map(farm => (
        <FarmCard key={farm.id} farm={farm} />
      ))}
    </div>
  );
};

export default FarmGrid;
