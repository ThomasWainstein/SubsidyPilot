
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Subsidy } from '@/types/subsidy';
import SubsidyFilters from '@/components/subsidy/SubsidyFilters';
import SavedFilterSets, { FilterSet } from '@/components/subsidy/SavedFilterSets';
import { uuidv4 } from '@/lib/utils';

const SubsidySearchPage = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [savedFilterSets, setSavedFilterSets] = useState<FilterSet[]>([]);
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    confidenceFilter: [0],
    regions: [] as string[],
    eligibleCountry: '',
    farmingTypes: [] as string[],
    fundingSources: [] as string[],
    fundingInstruments: [] as string[],
    documentsRequired: [] as string[],
    applicationFormats: [] as string[],
    sustainabilityGoals: [] as string[],
    deadlineStatuses: [] as string[],
  });

  // Clear all subsidies from database on page load
  useEffect(() => {
    const clearSubsidiesData = async () => {
      try {
        setLoading(true);
        
        // Delete all subsidies from database
        const { error } = await supabase
          .from('subsidies')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
        
        if (error) {
          console.error('Error clearing subsidies:', error);
        }
        
        // Set empty subsidies array
        setSubsidies([]);
      } catch (error) {
        console.error('Error in clearSubsidiesData:', error);
      } finally {
        setLoading(false);
      }
    };

    clearSubsidiesData();
  }, []);

  const clearFilters = () => {
    setFilters({
      confidenceFilter: [0],
      regions: [],
      eligibleCountry: '',
      farmingTypes: [],
      fundingSources: [],
      fundingInstruments: [],
      documentsRequired: [],
      applicationFormats: [],
      sustainabilityGoals: [],
      deadlineStatuses: [],
    });
  };

  const saveCurrentFilterSet = (name: string) => {
    const newSet: FilterSet = {
      id: uuidv4(),
      name,
      filters: { ...filters }
    };

    setSavedFilterSets([...savedFilterSets, newSet]);
  };

  const applyFilterSet = (set: FilterSet) => {
    setFilters(set.filters);
  };

  const removeFilterSet = (id: string) => {
    setSavedFilterSets(savedFilterSets.filter(set => set.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              European Subsidy Search Engine
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Find available subsidies for your farms
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {showFilters && (
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Filters</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <SavedFilterSets 
                      filterSets={savedFilterSets}
                      onApplyFilterSet={applyFilterSet}
                      onRemoveFilterSet={removeFilterSet}
                      currentFilters={filters}
                      onSaveCurrentFilters={saveCurrentFilterSet}
                    />

                    <SubsidyFilters 
                      filters={{
                        regions: filters.regions,
                        eligibleCountry: filters.eligibleCountry,
                        farmingTypes: filters.farmingTypes,
                        fundingSources: filters.fundingSources,
                        fundingInstruments: filters.fundingInstruments,
                        documentsRequired: filters.documentsRequired,
                        applicationFormats: filters.applicationFormats,
                        sustainabilityGoals: filters.sustainabilityGoals,
                        deadlineStatuses: filters.deadlineStatuses,
                      }}
                      setFilters={setFilters}
                      onClearFilters={clearFilters}
                      availableRegions={[]}
                      availableCountries={[]}
                      availableFundingTypes={[]}
                      availableCategories={[]}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              <Card>
                <CardHeader className="py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search Subsidies"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                      {searchQuery && (
                        <button 
                          className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-700"
                          onClick={() => setSearchQuery('')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <h2 className="text-xl font-semibold mb-4">Search Results</h2>

                  <div className="text-center py-12">
                    <h3 className="text-lg font-medium mb-2">No subsidies available</h3>
                    <p className="text-gray-500">The subsidy database is currently empty. Subsidies will be populated from real data sources.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubsidySearchPage;
