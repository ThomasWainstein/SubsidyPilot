
import React from 'react';
import EnhancedFarmCard from '@/components/dashboard/EnhancedFarmCard';
import { FarmCardSkeleton } from '@/components/ui/loading-skeleton';
import EmptyState from '@/components/states/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

// Transform farms to match FarmCard interface
const transformFarm = (farm: Farm) => ({
  id: farm.id,
  name: farm.name,
  address: farm.address,
  department: farm.department,
  total_hectares: farm.total_hectares,
  created_at: farm.created_at,
  updated_at: farm.updated_at,
  status: (farm.status as 'Profile Complete' | 'Incomplete' | 'Pending') || 'Profile Complete',
  certifications: []
});

const FarmGrid: React.FC<FarmGridProps> = ({ farms }) => {
  const navigate = useNavigate();

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
