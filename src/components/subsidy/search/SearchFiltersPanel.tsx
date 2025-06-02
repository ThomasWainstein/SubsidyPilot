
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubsidyFilters from '../SubsidyFilters';
import SavedFilterSets, { FilterSet } from '../SavedFilterSets';

interface FilterState {
  confidenceFilter: number[];
  regions: string[];
  eligibleCountry: string;
  farmingTypes: string[];
  fundingSources: string[];
  fundingInstruments: string[];
  documentsRequired: string[];
  applicationFormats: string[];
  sustainabilityGoals: string[];
  deadlineStatuses: string[];
}

interface SearchFiltersPanelProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  savedFilterSets: FilterSet[];
  onApplyFilterSet: (set: FilterSet) => void;
  onRemoveFilterSet: (id: string) => void;
  onSaveCurrentFilters: (name: string) => void;
  onClearFilters: () => void;
  availableRegions: string[];
  availableCategories: string[];
  availableFundingTypes: string[];
}

const SearchFiltersPanel: React.FC<SearchFiltersPanelProps> = ({
  filters,
  setFilters,
  savedFilterSets,
  onApplyFilterSet,
  onRemoveFilterSet,
  onSaveCurrentFilters,
  onClearFilters,
  availableRegions,
  availableCategories,
  availableFundingTypes
}) => {
  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Filters</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <SavedFilterSets 
          filterSets={savedFilterSets}
          onApplyFilterSet={onApplyFilterSet}
          onRemoveFilterSet={onRemoveFilterSet}
          currentFilters={filters}
          onSaveCurrentFilters={onSaveCurrentFilters}
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
          onClearFilters={onClearFilters}
          availableRegions={availableRegions}
          availableCountries={[]} // Can be populated from database if needed
          availableFundingTypes={availableFundingTypes}
          availableCategories={availableCategories}
        />
      </CardContent>
    </Card>
  );
};

export default SearchFiltersPanel;
