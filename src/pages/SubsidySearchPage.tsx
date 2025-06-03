
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import SearchHeader from '@/components/subsidy/search/SearchHeader';
import SearchFiltersPanel from '@/components/subsidy/search/SearchFiltersPanel';
import SearchResultsPanel from '@/components/subsidy/search/SearchResultsPanel';
import SearchLoadingState from '@/components/subsidy/search/SearchLoadingState';
import EmptyState from '@/components/states/EmptyState';
import PageErrorBoundary from '@/components/error/PageErrorBoundary';
import { FilterSet } from '@/components/subsidy/SavedFilterSets';
import { useSubsidyFiltering } from '@/hooks/useSubsidyFiltering';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { uuidv4 } from '@/lib/utils';
import { handleApiError } from '@/utils/errorHandling';
import { Search, AlertCircle } from 'lucide-react';

const SubsidySearchPage = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [savedFilterSets, setSavedFilterSets] = useState<FilterSet[]>([]);

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

  // Use the new filtering hook
  const { 
    subsidies, 
    loading, 
    error, 
    totalCount, 
    filteredCount 
  } = useSubsidyFiltering(farmId || '', filters, searchQuery);

  // Get filter options from database
  const { 
    regions: availableRegions, 
    categories: availableCategories, 
    fundingTypes: availableFundingTypes 
  } = useFilterOptions();

  // Handle API errors
  useEffect(() => {
    if (error) {
      handleApiError(error, 'Subsidy Search');
    }
  }, [error]);

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

  if (!farmId) {
    return (
      <PageErrorBoundary pageName="Subsidy Search">
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
          <Navbar />
          <main className="flex-grow py-6 px-4">
            <div className="container mx-auto">
              <EmptyState
                icon={AlertCircle}
                title="Farm ID Required"
                description="Please navigate to this page from a farm profile to search for matching subsidies."
                actionLabel="Go to Dashboard"
                onAction={() => window.location.href = '/dashboard'}
              />
            </div>
          </main>
        </div>
      </PageErrorBoundary>
    );
  }

  if (loading) {
    return <SearchLoadingState />;
  }

  return (
    <PageErrorBoundary pageName="Subsidy Search">
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />

        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto">
            <SearchHeader />

            {error ? (
              <EmptyState
                icon={AlertCircle}
                title="Error Loading Subsidies"
                description="Unable to load subsidy data. Please try again or contact support if the problem persists."
                actionLabel="Retry"
                onAction={() => window.location.reload()}
              />
            ) : (
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
                      availableRegions={availableRegions}
                      availableCategories={availableCategories}
                      availableFundingTypes={availableFundingTypes}
                    />
                  </div>
                )}

                <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
                  <SearchResultsPanel
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    showFilters={showFilters}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    subsidies={subsidies}
                    totalCount={totalCount}
                    filteredCount={filteredCount}
                    loading={loading}
                    error={error}
                    farmId={farmId}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PageErrorBoundary>
  );
};

export default SubsidySearchPage;
