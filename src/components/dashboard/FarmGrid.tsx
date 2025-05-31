
import React from 'react';
import FarmCard from '@/components/FarmCard';

interface DatabaseFarm {
  id: string;
  name: string;
  address: string;
  department: string | null;
  total_hectares: number | null;
  created_at: string;
  updated_at: string;
}

// Simple interface for FarmCard compatibility
interface FarmCardProps {
  id: string;
  name: string;
  address: string;
  department: string | null;
  total_hectares: number | null;
  created_at: string;
  updated_at: string;
  updatedAt: string;
  size: string;
  staff: number;
  status: 'Profile Complete' | 'Subsidy In Progress' | 'Needs Update' | 'In Review';
  region: string;
  tags: string[];
  certifications: string[];
  irrigationMethod: string;
  crops: string[];
  revenue: string;
  activities: string[];
  carbonScore: number;
  software: string[];
}

interface FarmGridProps {
  farms: DatabaseFarm[];
}

const FarmGrid = ({ farms }: FarmGridProps) => {
  // Transform database farms to match FarmCard interface with minimal required properties
  const transformedFarms: FarmCardProps[] = farms.map(farm => ({
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
    status: 'Profile Complete' as const,
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
