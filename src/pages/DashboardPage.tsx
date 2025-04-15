
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

  // Get unique regions and countries from farms
  const getUniqueRegions = () => {
    const uniqueRegions: string[] = [];
    
    farms.forEach(farm => {
      // Extract country from region (after comma) or use France as default
      let country: string;
      
      if (farm.region.includes(',')) {
        country = farm.region.split(',')[1].trim();
      } else {
        country = 'France'; // Default for French regions that don't specify country
      }
      
      // Add country if not already in the list
      if (!uniqueRegions.includes(country)) {
        uniqueRegions.push(country);
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
      farm.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || farm.status === statusFilter;
    
    // Check if farm's country/region matches filter
    const matchesRegion = () => {
      if (regionFilter.length === 0) return true;
      
      // Extract country from region string
      let farmCountry: string;
      
      if (farm.region.includes(',')) {
        farmCountry = farm.region.split(',')[1].trim();
      } else {
        farmCountry = 'France'; // Default for French regions
      }
      
      return regionFilter.includes(farmCountry);
    };
    
    return matchesSearch && matchesStatus && matchesRegion();
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.clientFarmDashboard')}</h1>
          </div>
          
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-9 space-y-6">
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
            
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <ConsultantMetrics />
              <AlertsActions />
              <FarmStatusOverview />
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
