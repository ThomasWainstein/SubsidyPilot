
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
}

interface FarmGridProps {
  farms: Farm[];
}

const FarmGrid = ({ farms }: FarmGridProps) => {
  // Transform farms to match FarmCard interface
  const transformedFarms = farms.map(farm => ({
    id: farm.id,
    name: farm.name,
    address: farm.address,
    department: farm.department,
    total_hectares: farm.total_hectares,
    created_at: farm.created_at,
    updated_at: farm.updated_at,
    updatedAt: farm.updated_at,
    size: farm.total_hectares ? `${farm.total_hectares} ha` : 'Unknown',
    staff: 0,
    status: 'active' as const,
    region: farm.department || 'Unknown',
    tags: [],
    certifications: [],
    irrigationMethod: 'Unknown',
    crops: [],
    revenue: '€0',
    activities: [],
    carbonScore: 0,
    software: []
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {transformedFarms.map(farm => (
        <FarmCard key={farm.id} farm={farm} />
      ))}
    </div>
  );
};

export default FarmGrid;
