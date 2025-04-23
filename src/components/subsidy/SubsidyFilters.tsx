
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import FilterSection from './FilterSection';
import FilterCheckbox from './FilterCheckbox';
import FilterTagButton from './FilterTagButton';

interface FilterState {
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

interface SubsidyFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onClearFilters: () => void;
}

const SubsidyFilters: React.FC<SubsidyFiltersProps> = ({ 
  filters, 
  setFilters,
  onClearFilters
}) => {
  const { t } = useLanguage();

  // Helper function for toggling array filters
  const toggleArrayFilter = (filterName: keyof FilterState, value: string) => {
    setFilters(prev => {
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
  const activeFilterCount = Object.values(filters).reduce((count, filterValue) => {
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
          <Badge variant="secondary" className="px-2 py-1">
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
          </Badge>
          <button 
            className="text-sm text-gray-500 hover:text-gray-800"
            onClick={onClearFilters}
          >
            {t('common.clear')}
          </button>
        </div>
      )}

      {/* Geographic Eligibility */}
      <FilterSection title="search.filters.geographicEligibility">
        <div className="mb-4">
          <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.region')}</h4>
          <div className="flex flex-wrap">
            {['France', 'Germany', 'Spain', 'Italy', 'Romania', 'Poland', 'EU-wide'].map(region => (
              <FilterTagButton
                key={region}
                value={region}
                active={filters.regions.includes(region)}
                onClick={() => toggleArrayFilter('regions', region)}
                translationKey={region}
              />
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.eligibleCountry')}</h4>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('search.filters.eligibleCountry')}
              className="pl-8"
              value={filters.eligibleCountry}
              onChange={(e) => setFilters(prev => ({ ...prev, eligibleCountry: e.target.value }))}
            />
            {filters.eligibleCountry && (
              <button 
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                onClick={() => setFilters(prev => ({ ...prev, eligibleCountry: '' }))}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </FilterSection>

      {/* Agricultural Sector */}
      <FilterSection title="search.filters.agriculturalSector">
        <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.farmingType')}</h4>
        <div className="flex flex-wrap">
          {[
            { value: 'arableCrops', key: 'search.filters.farmingType.arableCrops' },
            { value: 'vineyards', key: 'search.filters.farmingType.vineyards' },
            { value: 'livestock', key: 'search.filters.farmingType.livestock' },
            { value: 'aquaculture', key: 'search.filters.farmingType.aquaculture' },
            { value: 'mixedFarming', key: 'search.filters.farmingType.mixedFarming' },
            { value: 'greenhouse', key: 'search.filters.farmingType.greenhouse' },
          ].map(type => (
            <FilterTagButton
              key={type.value}
              value={type.value}
              active={filters.farmingTypes.includes(type.value)}
              onClick={() => toggleArrayFilter('farmingTypes', type.value)}
              translationKey={type.key}
            />
          ))}
        </div>
      </FilterSection>

      {/* Funding Type */}
      <FilterSection title="search.filters.fundingType">
        <div className="mb-4">
          <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.fundingSource')}</h4>
          <div>
            {[
              { value: 'public', key: 'search.filters.fundingSource.public' },
              { value: 'private', key: 'search.filters.fundingSource.private' },
              { value: 'hybrid', key: 'search.filters.fundingSource.hybrid' },
            ].map(source => (
              <FilterCheckbox
                key={source.value}
                id={`funding-source-${source.value}`}
                value={source.value}
                checked={filters.fundingSources.includes(source.value)}
                onChange={() => toggleArrayFilter('fundingSources', source.value)}
                translationKey={source.key}
              />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.fundingInstrument')}</h4>
          <div className="flex flex-wrap">
            {[
              { value: 'grant', key: 'search.filters.fundingInstrument.grant' },
              { value: 'subsidy', key: 'search.filters.fundingInstrument.subsidy' },
              { value: 'taxCredit', key: 'search.filters.fundingInstrument.taxCredit' },
              { value: 'loan', key: 'search.filters.fundingInstrument.loan' },
              { value: 'technicalAssistance', key: 'search.filters.fundingInstrument.technicalAssistance' },
            ].map(instrument => (
              <FilterTagButton
                key={instrument.value}
                value={instrument.value}
                active={filters.fundingInstruments.includes(instrument.value)}
                onClick={() => toggleArrayFilter('fundingInstruments', instrument.value)}
                translationKey={instrument.key}
              />
            ))}
          </div>
        </div>
      </FilterSection>

      {/* Application Requirements */}
      <FilterSection title="search.filters.applicationRequirements">
        <div className="mb-4">
          <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.documentsRequired')}</h4>
          <div className="flex flex-wrap">
            {[
              { value: 'businessPlan', key: 'search.filters.documentsRequired.businessPlan' },
              { value: 'sustainabilityReport', key: 'search.filters.documentsRequired.sustainabilityReport' },
              { value: 'carbonAssessment', key: 'search.filters.documentsRequired.carbonAssessment' },
              { value: 'euFarmId', key: 'search.filters.documentsRequired.euFarmId' },
              { value: 'digitalCertification', key: 'search.filters.documentsRequired.digitalCertification' },
              { value: 'previousGrantRecord', key: 'search.filters.documentsRequired.previousGrantRecord' },
            ].map(doc => (
              <FilterTagButton
                key={doc.value}
                value={doc.value}
                active={filters.documentsRequired.includes(doc.value)}
                onClick={() => toggleArrayFilter('documentsRequired', doc.value)}
                translationKey={doc.key}
              />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.applicationFormat')}</h4>
          <div>
            {[
              { value: 'online', key: 'search.filters.applicationFormat.online' },
              { value: 'pdf', key: 'search.filters.applicationFormat.pdf' },
              { value: 'portal', key: 'search.filters.applicationFormat.portal' },
              { value: 'consultant', key: 'search.filters.applicationFormat.consultant' },
            ].map(format => (
              <FilterCheckbox
                key={format.value}
                id={`application-format-${format.value}`}
                value={format.value}
                checked={filters.applicationFormats.includes(format.value)}
                onChange={() => toggleArrayFilter('applicationFormats', format.value)}
                translationKey={format.key}
              />
            ))}
          </div>
        </div>
      </FilterSection>

      {/* Strategic Alignment */}
      <FilterSection title="search.filters.strategicAlignment">
        <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.sustainabilityGoals')}</h4>
        <div>
          {[
            { value: 'organicTransition', key: 'search.filters.sustainabilityGoals.organicTransition' },
            { value: 'waterEfficiency', key: 'search.filters.sustainabilityGoals.waterEfficiency' },
            { value: 'emissionReduction', key: 'search.filters.sustainabilityGoals.emissionReduction' },
            { value: 'soilHealth', key: 'search.filters.sustainabilityGoals.soilHealth' },
            { value: 'biodiversity', key: 'search.filters.sustainabilityGoals.biodiversity' },
            { value: 'climateAdaptation', key: 'search.filters.sustainabilityGoals.climateAdaptation' },
          ].map(goal => (
            <FilterCheckbox
              key={goal.value}
              id={`sustainability-goal-${goal.value}`}
              value={goal.value}
              checked={filters.sustainabilityGoals.includes(goal.value)}
              onChange={() => toggleArrayFilter('sustainabilityGoals', goal.value)}
              translationKey={goal.key}
            />
          ))}
        </div>
      </FilterSection>

      {/* Deadline Status */}
      <FilterSection title="search.filters.deadlineStatus">
        <h4 className="text-xs text-gray-500 mb-2">{t('search.filters.deadline')}</h4>
        <div>
          {[
            { value: 'open', key: 'search.filters.deadline.open' },
            { value: 'closingSoon', key: 'search.filters.deadline.closingSoon' },
            { value: 'closed', key: 'search.filters.deadline.closed' },
          ].map(status => (
            <FilterCheckbox
              key={status.value}
              id={`deadline-status-${status.value}`}
              value={status.value}
              checked={filters.deadlineStatuses.includes(status.value)}
              onChange={() => toggleArrayFilter('deadlineStatuses', status.value)}
              translationKey={status.key}
            />
          ))}
        </div>
      </FilterSection>
    </div>
  );
};

export default SubsidyFilters;
