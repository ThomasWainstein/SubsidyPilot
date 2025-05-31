
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import AddFarmModal from '@/components/dashboard/AddFarmModal';
import FarmGrid from '@/components/dashboard/FarmGrid';
import { toast } from '@/hooks/use-toast';

interface Farm {
  id: string;
  name: string;
  address: string;
  department: string | null;
  total_hectares: number | null;
  created_at: string;
  updated_at: string;
  status?: string; // For compatibility with existing FarmCard component
  region?: string; // For compatibility
  tags?: string[]; // For compatibility
}

const DashboardPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch farms from Supabase
  useEffect(() => {
    const fetchFarms = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        // Transform data for compatibility with existing components
        const transformedFarms = data.map(farm => ({
          ...farm,
          status: 'active', // Default status for compatibility
          region: farm.department || 'Unknown',
          tags: farm.land_use_types || []
        }));

        setFarms(transformedFarms);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: 'Failed to load farms: ' + error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFarms();
  }, [user]);

  // Get unique regions from farms
  const getUniqueRegions = () => {
    const uniqueRegions: string[] = [];
    
    farms.forEach(farm => {
      const region = farm.department || 'Unknown';
      if (!uniqueRegions.includes(region)) {
        uniqueRegions.push(region);
      }
    });
    
    return uniqueRegions;
  };

  const uniqueRegions = getUniqueRegions();

  // Toggle region in filter
  const toggleRegionFilter = (region: string) => {
    if (regionFilter.includes(region)) {
      setRegionFilter(regionFilter.filter(r => r !== region));
    } else {
      setRegionFilter([...regionFilter, region]);
    }
  };

  // Filter farms based on search query, status, and region
  const filteredFarms = farms.filter(farm => {
    const matchesSearch = 
      farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (farm.department || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (farm.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || farm.status === statusFilter;
    
    const matchesRegion = () => {
      if (regionFilter.length === 0) return true;
      const farmRegion = farm.department || 'Unknown';
      return regionFilter.includes(farmRegion);
    };
    
    return matchesSearch && matchesStatus && matchesRegion();
  });
  
  // Sort farms based on sort option
  const sortedFarms = [...filteredFarms].sort((a, b) => {
    switch (sortOption) {
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      case 'region':
        return (a.department || '').localeCompare(b.department || '');
      case 'updated':
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-lg">Loading farms...</div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.clientFarmDashboard')}</h1>
          </div>
          
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6">
              <DashboardFilters 
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortOption={sortOption}
                setSortOption={setSortOption}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                regionFilter={regionFilter}
                toggleRegionFilter={toggleRegionFilter}
                uniqueRegions={uniqueRegions}
                onAddFarm={() => setIsAddFarmModalOpen(true)}
              />
              
              {farms.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No farms yet</h3>
                  <p className="text-gray-600 mb-4">Create your first farm to get started</p>
                  <button
                    onClick={() => setIsAddFarmModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    Add Your First Farm
                  </button>
                </div>
              ) : (
                <FarmGrid farms={sortedFarms} />
              )}
            </div>
          </div>
        </div>
      </main>
      
      <AddFarmModal 
        isOpen={isAddFarmModalOpen}
        onClose={() => setIsAddFarmModalOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
