
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Badge } from '@/components/ui/badge';
import GeographicEligibilityFilter from './filters/GeographicEligibilityFilter';
import AgriculturalSectorFilter from './filters/AgriculturalSectorFilter';
import FundingTypeFilter from './filters/FundingTypeFilter';
import OrganizationFilter from './filters/OrganizationFilter';
import AmountRangeFilter from './filters/AmountRangeFilter';
import ApplicationRequirementsFilter from './filters/ApplicationRequirementsFilter';
import StrategicAlignmentFilter from './filters/StrategicAlignmentFilter';
import DeadlineStatusFilter from './filters/DeadlineStatusFilter';

interface FilterState {
  regions: string[];
  eligibleCountry: string;
  farmingTypes: string[];
  fundingSources: string[];
  fundingInstruments: string[];
  organizations: string[];
  amountRanges: string[];
  documentsRequired: string[];
  applicationFormats: string[];
  sustainabilityGoals: string[];
  deadlineStatuses: string[];
}

interface SubsidyFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  onClearFilters: () => void;
  availableRegions?: string[];
  availableCountries?: string[];
  availableFundingTypes?: string[];
  availableCategories?: string[];
  availableSectors?: string[];
  availableOrganizations?: string[];
  availableAmountRanges?: { label: string; min: number; max: number }[];
}

const SubsidyFilters: React.FC<SubsidyFiltersProps> = ({ 
  filters, 
  setFilters,
  onClearFilters,
  availableRegions = [],
  availableCountries = [],
  availableFundingTypes = [],
  availableCategories = [],
  availableSectors = [],
  availableOrganizations = [],
  availableAmountRanges = []
}) => {
  const { t } = useLanguage();

  // Helper function for toggling array filters
  const toggleArrayFilter = (filterName: keyof FilterState, value: string) => {
    setFilters((prev: any) => {
      const currentArray = prev[filterName] as string[];
      if (currentArray.includes(value)) {
        return {
          ...prev,
          [filterName]: currentArray.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [filterName]: [...currentArray, value]
        };
      }
    });
  };

  // Count active filters
  const activeFilterCount = Object.entries(filters).reduce((count, [key, filterValue]) => {
    if (key === 'eligibleCountry') {
      return count + (filterValue && typeof filterValue === 'string' && filterValue.length > 0 ? 1 : 0);
    }
    if (Array.isArray(filterValue)) {
      return count + filterValue.length;
    } else if (typeof filterValue === 'string' && filterValue) {
      return count + 1;
    }
    return count;
  }, 0);

  return (
    <div className="space-y-6">
      {activeFilterCount > 0 && (
        <div className="flex justify-between items-center mb-4">
          <Badge variant="secondary" className="px-2 py-1 bg-primary/10 text-primary border-primary/20">
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
          </Badge>
          <button 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClearFilters}
          >
            Clear All
          </button>
        </div>
      )}

      <GeographicEligibilityFilter
        regions={filters.regions}
        eligibleCountry={filters.eligibleCountry}
        availableRegions={availableRegions}
        onRegionToggle={(region) => toggleArrayFilter('regions', region)}
        onCountryChange={(country) => setFilters((prev: any) => ({ ...prev, eligibleCountry: country }))}
      />

      <AgriculturalSectorFilter
        farmingTypes={filters.farmingTypes}
        availableCategories={availableCategories}
        availableSectors={availableSectors}
        onFarmingTypeToggle={(type) => toggleArrayFilter('farmingTypes', type)}
      />

      <FundingTypeFilter
        fundingSources={filters.fundingSources}
        fundingInstruments={filters.fundingInstruments}
        availableFundingTypes={availableFundingTypes}
        onFundingSourceToggle={(source) => toggleArrayFilter('fundingSources', source)}
        onFundingInstrumentToggle={(instrument) => toggleArrayFilter('fundingInstruments', instrument)}
      />

      {availableOrganizations.length > 0 && (
        <OrganizationFilter
          selectedOrganizations={filters.organizations || []}
          availableOrganizations={availableOrganizations}
          onOrganizationToggle={(org) => toggleArrayFilter('organizations', org)}
        />
      )}

      {availableAmountRanges.length > 0 && (
        <AmountRangeFilter
          selectedRanges={filters.amountRanges || []}
          availableRanges={availableAmountRanges}
          onRangeToggle={(range) => toggleArrayFilter('amountRanges', range)}
        />
      )}

      <ApplicationRequirementsFilter
        documentsRequired={filters.documentsRequired}
        applicationFormats={filters.applicationFormats}
        onDocumentRequiredToggle={(doc) => toggleArrayFilter('documentsRequired', doc)}
        onApplicationFormatToggle={(format) => toggleArrayFilter('applicationFormats', format)}
      />

      <StrategicAlignmentFilter
        sustainabilityGoals={filters.sustainabilityGoals}
        onSustainabilityGoalToggle={(goal) => toggleArrayFilter('sustainabilityGoals', goal)}
      />

      <DeadlineStatusFilter
        deadlineStatuses={filters.deadlineStatuses}
        onDeadlineStatusToggle={(status) => toggleArrayFilter('deadlineStatuses', status)}
      />
    </div>
  );
};

export default SubsidyFilters;
