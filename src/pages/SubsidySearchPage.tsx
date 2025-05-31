
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subsidy } from '@/types/subsidy';
import { uuidv4 } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import SearchHeader from '@/components/subsidy/search/SearchHeader';
import SearchFiltersPanel from '@/components/subsidy/search/SearchFiltersPanel';
import SearchResultsPanel from '@/components/subsidy/search/SearchResultsPanel';
import SearchLoadingState from '@/components/subsidy/search/SearchLoadingState';
import { FilterSet } from '@/components/subsidy/SavedFilterSets';

const SubsidySearchPage = () => {
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
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
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
    return <SearchLoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto">
          <SearchHeader />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {showFilters && (
              <div className="lg:col-span-1">
                <SearchFiltersPanel
                  filters={filters}
                  setFilters={setFilters}
                  savedFilterSets={savedFilterSets}
                  onApplyFilterSet={applyFilterSet}
                  onRemoveFilterSet={removeFilterSet}
                  onSaveCurrentFilters={saveCurrentFilterSet}
                  onClearFilters={clearFilters}
                />
              </div>
            )}

            <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              <SearchResultsPanel
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubsidySearchPage;
