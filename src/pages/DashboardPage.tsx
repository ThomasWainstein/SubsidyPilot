
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { farms } from '@/data/farms';
import FarmCard from '@/components/FarmCard';
import ConsultantMetrics from '@/components/ConsultantMetrics';
import AlertsActions from '@/components/AlertsActions';
import FarmStatusOverview from '@/components/FarmStatusOverview';
import RegionOverview from '@/components/RegionOverview';
import DashboardOnboarding from '@/components/DashboardOnboarding';
import { Button } from '@/components/ui/button';
import { Plus, Search, SortAsc, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
    // Search filter
    const matchesSearch = 
      farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      farm.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || farm.status === statusFilter;
    
    // Region filter
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full">
                  <div className="relative flex-1 md:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search client farms..."
                      className="pl-10 w-full md:w-auto"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder={t('dashboard.filterByStatus')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('dashboard.allFarms')}</SelectItem>
                      <SelectItem value="In Review">{t('status.inReview')}</SelectItem>
                      <SelectItem value="Needs Update">{t('status.needsUpdate')}</SelectItem>
                      <SelectItem value="Profile Complete">{t('status.profileComplete')}</SelectItem>
                      <SelectItem value="Subsidy In Progress">{t('status.subsidyInProgress')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-full md:w-48">
                      <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4" />
                        <SelectValue placeholder={t('dashboard.sortBy')} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="region">Region</SelectItem>
                      <SelectItem value="updated">Last Updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={() => setIsAddFarmModalOpen(true)}>
                  <Plus size={18} className="mr-2" />
                  {t('common.addNewClientFarm')}
                </Button>
              </div>
              
              {/* Region filter chips */}
              {uniqueRegions.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {uniqueRegions.map(region => (
                    <Badge 
                      key={region}
                      variant={regionFilter.includes(region) ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => toggleRegionFilter(region)}
                    >
                      {region}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedFarms.map(farm => (
                  <FarmCard key={farm.id} farm={farm} />
                ))}
              </div>
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
      
      {/* Add Farm Modal */}
      <Dialog open={isAddFarmModalOpen} onOpenChange={setIsAddFarmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.addNewClientFarm')}</DialogTitle>
            <DialogDescription>
              Choose how you want to add a new client farm to your portfolio.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="manual" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="document">Document Upload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="farm-name">Farm Name</Label>
                <Input id="farm-name" placeholder="Enter client farm name" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm-region">Region</Label>
                <Input id="farm-region" placeholder="Enter region" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm-tags">Tags (comma separated)</Label>
                <Input id="farm-tags" placeholder="organic, sustainability, etc." />
              </div>
            </TabsContent>
            
            <TabsContent value="document" className="space-y-4 py-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Drag and drop files here, or click to select files</p>
                <p className="mt-1 text-xs text-gray-500">Support for PDFs, Excel and Word documents</p>
                <Button variant="outline" className="mt-4">Select Files</Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFarmModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => setIsAddFarmModalOpen(false)}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Onboarding component */}
      <DashboardOnboarding />
    </div>
  );
};

export default DashboardPage;
