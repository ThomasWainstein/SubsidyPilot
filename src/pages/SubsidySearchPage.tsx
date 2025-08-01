
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
import { Search, AlertCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import DocumentProcessingPipeline from '@/components/admin/DocumentProcessingPipeline';
import DocumentProcessingDemo from '@/components/test/DocumentProcessingDemo';
import SchemaExtractionDemo from '@/components/test/SchemaExtractionDemo';

const SubsidySearchPage = () => {
  const { farmId } = useParams<{ farmId: string }>();
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
    />
  );

  return (
    <PageErrorBoundary pageName="Subsidy Search">
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />

        <main className="flex-grow py-4 md:py-6 px-4">
          <div className="container mx-auto">
            <SearchHeader />
            
            {/* Document Processing Test */}
            <div className="mb-6">
              <DocumentProcessingDemo className="max-w-4xl mx-auto" />
            </div>
            
            {/* Schema Extraction Test */}
            <div className="mb-8">
              <SchemaExtractionDemo className="max-w-4xl mx-auto" />
            </div>

            {error ? (
              <EmptyState
                icon={AlertCircle}
                title="Error Loading Subsidies"
                description="Unable to load subsidy data. Please try again or contact support if the problem persists."
                actionLabel="Retry"
                onAction={() => window.location.reload()}
              />
            ) : (
              <div className="space-y-4">
                {/* Mobile filters as sheet */}
                <div className="lg:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full flex items-center gap-2 min-h-[44px]">
                        <Filter size={16} />
                        Filters & Search
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full sm:w-80 p-0">
                      <div className="h-full overflow-y-auto p-4">
                        <FiltersContent />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:grid lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1">
                    <FiltersContent />
                  </div>
                  <div className="lg:col-span-3">
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
                </div>

                {/* Mobile layout */}
                <div className="lg:hidden">
                  <SearchResultsPanel
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    showFilters={false}
                    onToggleFilters={() => {}}
                    subsidies={subsidies as any}
                    totalCount={totalCount}
                    filteredCount={filteredCount}
                    loading={loading}
                    error={error}
                    farmId={farmId}
                    onClearFilters={clearFilters}
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
