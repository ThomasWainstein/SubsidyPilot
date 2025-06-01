
import React from 'react';
import FarmCard from '@/components/FarmCard';
import { useFarms } from '@/hooks/useFarms';
import { Skeleton } from '@/components/ui/skeleton';

interface DatabaseFarm {
  id: string;
  name: string;
  address: string;
  department: string | null;
  total_hectares: number | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string;
  legal_status: string | null;
  livestock_present: boolean | null;
  land_use_types: string[] | null;
  matching_tags: string[] | null;
}

// Transform database farms to match FarmCard interface
const transformFarm = (farm: DatabaseFarm) => ({
  id: farm.id,
  name: farm.name,
  address: farm.address,
  department: farm.department,
  total_hectares: farm.total_hectares,
  created_at: farm.created_at || '',
  updated_at: farm.updated_at || '',
  updatedAt: farm.updated_at || '',
  size: farm.total_hectares ? `${farm.total_hectares} ha` : 'Unknown',
  staff: 0,
  status: 'Profile Complete' as const,
  region: farm.department || 'Unknown',
  tags: farm.matching_tags || [],
  certifications: [],
  irrigationMethod: 'Unknown',
  crops: farm.land_use_types || [],
  revenue: '€0',
  activities: farm.land_use_types || [],
  carbonScore: 0,
  software: []
});

const FarmGrid = () => {
  const { data: farms, isLoading, error } = useFarms();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Error loading farms: {error.message}</p>
      </div>
    );
  }

  if (!farms || farms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg mb-4">No farms found</p>
        <p className="text-gray-400">Create your first farm to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {farms.map(farm => (
        <FarmCard key={farm.id} farm={transformFarm(farm)} />
      ))}
    </div>
  );
};

export default FarmGrid;
