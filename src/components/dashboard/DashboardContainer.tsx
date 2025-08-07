
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/language';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import AddFarmModal from '@/components/dashboard/AddFarmModal';
import FarmGrid from '@/components/dashboard/FarmGrid';
import DashboardErrorFallback from '@/components/dashboard/DashboardErrorFallback';
import DashboardOverview from '@/components/dashboard/DashboardOverview';
import EnhancedAlertsActions from '@/components/dashboard/EnhancedAlertsActions';
import { toast } from '@/hooks/use-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import EnhancedErrorBoundary from '@/components/error/EnhancedErrorBoundary';
import { logger } from '@/lib/logger';
import { prodLogger } from '@/utils/productionLogger';

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

const DashboardContainer = () => {
  prodLogger.debug('DashboardContainer: Rendering');
  
  // Wrap language context usage in try-catch
  let t: any;
  try {
    const { t: translation } = useLanguage();
    t = translation;
  } catch (error) {
    logger.error('DashboardContainer: Error getting language context:', error);
    // Fallback translation function with proper error handling
    t = (key: string) => {
      logger.warn(`Translation missing for key: ${key}`);
      return key.split('.').pop() || key;
    };
  }

  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState('name');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState<string[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch farms from Supabase
  useEffect(() => {
    const fetchFarms = async () => {
      if (!user) {
        prodLogger.debug('DashboardContainer: No user, skipping farm fetch');
        setLoading(false);
        return;
      }

      prodLogger.debug(`DashboardContainer: Fetching farms for user: ${user.id}`);

      try {
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', user.id);

        prodLogger.debug('DashboardContainer: Farms query result', { data, error });

        if (error) throw error;

        // Transform data for compatibility with existing components
        const transformedFarms = data.map(farm => ({
          ...farm,
          status: 'active' as const,
          region: farm.department || 'Unknown',
          tags: Array.isArray(farm.land_use_types) ? farm.land_use_types : []
        }));

        prodLogger.debug('DashboardContainer: Transformed farms', transformedFarms);
        setFarms(transformedFarms);
        setError(null);
      } catch (error: any) {
        prodLogger.error('DashboardContainer: Error fetching farms:', error);
        setError(error.message);
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

  // Memoize unique regions calculation
  const uniqueRegions = useMemo(() => {
    const regions: string[] = [];
    
    farms.forEach(farm => {
      const region = farm.department || 'Unknown';
      if (!regions.includes(region)) {
        regions.push(region);
      }
    });
    
    return regions;
  }, [farms]);

  // Memoize toggle region filter callback
  const toggleRegionFilter = useCallback((region: string) => {
    setRegionFilter(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  }, []);

  // Memoize filtered farms
  const filteredFarms = useMemo(() => {
    return farms.filter(farm => {
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
  }, [farms, searchQuery, statusFilter, regionFilter]);
  
  // Memoize sorted farms
  const sortedFarms = useMemo(() => {
    return [...filteredFarms].sort((a, b) => {
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
  }, [filteredFarms, sortOption]);

  // Memoize callback for adding farm
  const handleAddFarm = useCallback(() => {
    setIsAddFarmModalOpen(true);
  }, []);

  if (loading) {
    prodLogger.debug('DashboardContainer: Showing loading state');
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <div className="text-lg">Loading farms...</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    prodLogger.debug('DashboardContainer: Showing error state', { error });
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Farms</div>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    // Trigger refetch via state update
                    const fetchFarms = async () => {
                      try {
                        const { data, error } = await supabase
                          .from('farms')
                          .select('*')
                          .eq('user_id', user?.id);
                        if (error) throw error;
                        const transformedFarms = data.map(farm => ({
                          ...farm,
                          status: 'active' as const,
                          region: farm.department || 'Unknown',
                          tags: Array.isArray(farm.land_use_types) ? farm.land_use_types : []
                        }));
                        setFarms(transformedFarms);
                        setError(null);
                      } catch (error: any) {
                        setError(error.message);
                      } finally {
                        setLoading(false);
                      }
                    };
                    fetchFarms();
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  prodLogger.debug('DashboardContainer: Rendering main content', { farmCount: farms.length });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {typeof t === 'function' ? t('dashboard.clientFarmDashboard') : 'Farm Dashboard'}
            </h1>
          </div>
          
          <div className="grid grid-cols-12 gap-6">
            {/* Main content area - Farm cards prioritized */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <EnhancedErrorBoundary fallback={DashboardErrorFallback} context="Dashboard Filters">
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
                  onAddFarm={handleAddFarm}
                />
              </EnhancedErrorBoundary>
              
              {farms.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No farms yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Create your first farm to get started</p>
                  <button
                    onClick={handleAddFarm}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Add Your First Farm
                  </button>
                </div>
              ) : (
                <EnhancedErrorBoundary fallback={DashboardErrorFallback} context="Farm Grid">
                  <FarmGrid farms={sortedFarms} />
                </EnhancedErrorBoundary>
              )}
            </div>

            {/* Right sidebar - All metrics and secondary info */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Simple farm summary */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Farm Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Total Farms:</span>
                    <span className="font-medium">{farms.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Filtered Results:</span>
                    <span className="font-medium">{sortedFarms.length}</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Overview in sidebar */}
              <EnhancedErrorBoundary fallback={DashboardErrorFallback} context="Dashboard Overview">
                <DashboardOverview farmCount={farms.length} />
              </EnhancedErrorBoundary>

              {/* Alerts and actions */}
              <EnhancedErrorBoundary fallback={DashboardErrorFallback} context="Alerts and Actions">
                <EnhancedAlertsActions farmIds={farms.map(f => f.id)} />
              </EnhancedErrorBoundary>
            </div>
          </div>
        </div>
      </main>
      
      <EnhancedErrorBoundary fallback={DashboardErrorFallback} context="Add Farm Modal">
        <AddFarmModal 
          isOpen={isAddFarmModalOpen}
          onClose={() => setIsAddFarmModalOpen(false)}
        />
      </EnhancedErrorBoundary>
    </div>
  );
};

export default DashboardContainer;
