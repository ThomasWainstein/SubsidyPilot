
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { farms } from '@/data/farms';
import ConsultantMetrics from '@/components/ConsultantMetrics';
import AlertsActions from '@/components/AlertsActions';
import FarmStatusOverview from '@/components/FarmStatusOverview';
import RegionOverview from '@/components/RegionOverview';
import DashboardOnboarding from '@/components/DashboardOnboarding';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import AddFarmModal from '@/components/dashboard/AddFarmModal';
import FarmGrid from '@/components/dashboard/FarmGrid';

const DashboardPage = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState<string[]>([]);

  // Get unique regions from farms
  const uniqueRegions = Array.from(new Set(farms.map(farm => farm.region)));

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
      farm.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || farm.status === statusFilter;
    const matchesRegion = regionFilter.length === 0 || regionFilter.includes(farm.region);
    
    return matchesSearch && matchesStatus && matchesRegion;
  });
  
  // Sort farms based on sort option
  const sortedFarms = [...filteredFarms].sort((a, b) => {
    switch (sortOption) {
      case 'status':
        return a.status.localeCompare(b.status);
      case 'region':
        return a.region.localeCompare(b.region);
      case 'updated':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.clientFarmDashboard')}</h1>
            <p className="text-gray-600">{t('dashboard.clientFarmSubtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3">
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
              
              <FarmGrid farms={sortedFarms} />
            </div>
            
            <div className="space-y-6">
              <ConsultantMetrics />
              <FarmStatusOverview />
              <AlertsActions />
              <RegionOverview />
            </div>
          </div>
        </div>
      </main>
      
      <AddFarmModal 
        isOpen={isAddFarmModalOpen}
        onClose={() => setIsAddFarmModalOpen(false)}
      />
      
      <DashboardOnboarding />
    </div>
  );
};

export default DashboardPage;
