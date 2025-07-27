
import React from 'react';
import EnhancedFarmCard from '@/components/dashboard/EnhancedFarmCard';
import { useFarms } from '@/hooks/useFarms';
import { FarmCardSkeleton } from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/states/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '@/utils/errorHandling';

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
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <FarmCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    handleApiError(error, 'Farms');
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error Loading Farms"
        description="Unable to load your farms. Please try again or contact support if the problem persists."
        actionLabel="Try Again"
        onAction={() => window.location.reload()}
      />
    );
  }

  if (!farms || farms.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title="No farms found"
        description="Get started by creating your first farm profile to access subsidies and manage your agricultural operations."
        actionLabel="Create Your First Farm"
        onAction={() => navigate('/farm/new')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {farms.map(farm => (
        <EnhancedFarmCard key={farm.id} farm={transformFarm(farm)} />
      ))}
    </div>
  );
};

export default FarmGrid;
