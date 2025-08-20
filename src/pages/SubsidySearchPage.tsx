
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Search, AlertCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AdminPanelLink from '@/components/admin/AdminPanelLink';

const SubsidySearchPage = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false); // Start with filters hidden on mobile
  const [savedFilterSets, setSavedFilterSets] = useState<FilterSet[]>([]);

  const [filters, setFilters] = useState({
    confidenceFilter: [0],
    regions: [] as string[],
    eligibleCountry: '',
    farmingTypes: [] as string[],
    fundingSources: [] as string[],
    fundingInstruments: [] as string[],
    organizations: [] as string[],
    amountRanges: [] as string[],
    documentsRequired: [] as string[],
    applicationFormats: [] as string[],
    sustainabilityGoals: [] as string[],
    deadlineStatuses: [] as string[],
  });

  // Use the new filtering hook - farmId is now optional
  const { 
    subsidies, 
    loading, 
    error, 
    totalCount, 
    filteredCount 
  } = useSubsidyFiltering(farmId, filters, searchQuery);

  // Get filter options from database
  const { 
    regions: availableRegions, 
    categories: availableCategories, 
    fundingTypes: availableFundingTypes,
    organizations: availableOrganizations,
    amountRanges: availableAmountRanges,
    sectors: availableSectors
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
      organizations: [],
      amountRanges: [],
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

  // Farm ID is now optional - if present, it enables farm-specific matching
  // If not present, show all subsidies without farm matching

  if (loading) {
    return <SearchLoadingState />;
  }

  const FiltersContent = () => (
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
      availableOrganizations={availableOrganizations}
      availableAmountRanges={availableAmountRanges}
      availableSectors={availableSectors}
    />
  );

  return (
    <PageErrorBoundary pageName="Subsidy Search">
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />

        <main className="flex-grow">
          <div className="w-full">
            {/* Header Section - Full Width */}
            <div className="border-b bg-white dark:bg-gray-800 px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <SearchHeader />
                </div>
                <AdminPanelLink />
              </div>
            </div>

            {error ? (
              <div className="px-6 py-8">
                <EmptyState
                  icon={AlertCircle}
                  title="Error Loading Subsidies"
                  description="Unable to load subsidy data. Please try again or contact support if the problem persists."
                  actionLabel="Retry"
                  onAction={() => navigate(0)}
                />
              </div>
            ) : (
              <div className="flex min-h-screen">
                {/* Desktop Sidebar - Always visible */}
                <aside className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
                  <div className="p-6">
                    <div className="pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Filter className="w-5 h-5 text-primary" />
                        Filter Options
                      </h2>
                      <p className="text-sm text-muted-foreground">Refine your search results</p>
                    </div>
                    <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                      <FiltersContent />
                    </div>
                  </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900">
                  <div className="p-6">
                    {/* Mobile filters as sheet - hidden on desktop */}
                    <div className="lg:hidden mb-6">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" className="w-full flex items-center gap-2 min-h-[44px]">
                            <Filter size={16} />
                            Filter & Search Options
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-full sm:w-80 p-0">
                          <div className="h-full overflow-y-auto p-4">
                            <FiltersContent />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>

                    {/* Search Results */}
                    <SearchResultsPanel
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      showFilters={showFilters}
                      onToggleFilters={() => setShowFilters(!showFilters)}
                      subsidies={subsidies as any}
                      totalCount={totalCount}
                      filteredCount={filteredCount}
                      loading={loading}
                      error={error}
                      farmId={farmId}
                      onClearFilters={clearFilters}
                    />
                  </div>
                </main>
              </div>
            )}
          </div>
        </main>
      </div>
    </PageErrorBoundary>
  );
};

export default SubsidySearchPage;
