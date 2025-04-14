
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
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DashboardPage = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Toggle dark mode (demo only)
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // In a real implementation, we would apply a dark class to the html element
    // document.documentElement.classList.toggle('dark');
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
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <Navbar />
      
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.clientFarmDashboard')}</h1>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDarkMode}
              className="theme-toggle"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
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
