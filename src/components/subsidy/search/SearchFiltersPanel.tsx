
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/language';
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
  const { t } = useLanguage();

  return (
    <div className="w-full">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {t('search.filters.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4">
          <SavedFilterSets 
            filterSets={savedFilterSets}
            onApplyFilterSet={onApplyFilterSet}
            onRemoveFilterSet={onRemoveFilterSet}
            currentFilters={filters}
            onSaveCurrentFilters={onSaveCurrentFilters}
          />

          <div className="border-t pt-4">
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
              availableCountries={[]}
              availableFundingTypes={availableFundingTypes}
              availableCategories={availableCategories}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchFiltersPanel;
