
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, MapPin, Euro } from 'lucide-react';
import EmptySubsidyState from './EmptySubsidyState';
import SubsidyLoadingCard from './SubsidyLoadingCard';
import { useNavigate } from 'react-router-dom';

interface Subsidy {
  id: string;
  title: any;
  description: any;
  region: string | string[] | null; // Updated to handle different data types
  categories?: string[]; // Made optional since subsidies_structured uses sector
  sector?: string; // Added for subsidies_structured
  funding_type: string;
  deadline: string;
  amount_min?: number; // Made optional for subsidies_structured
  amount_max?: number; // Made optional for subsidies_structured
  amount?: number; // Added for subsidies_structured
  agency?: string; // Added for subsidies_structured
  matchConfidence: number;
}

interface SearchResultsPanelProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  subsidies: Subsidy[];
  totalCount: number;
  filteredCount: number;
  loading: boolean;
  error: string | null;
  farmId?: string; // Now optional
  onClearFilters?: () => void;
}

import { formatFundingAmount, getSubsidyTitle, getSubsidyDescription, getRegionDisplay, getDeadlineStatus, getSectorDisplayString, formatFilterLabel } from '@/utils/subsidyFormatting';

const SubsidyCard = ({ subsidy, showMatchScore }: { subsidy: Subsidy; showMatchScore: boolean }) => {
  const navigate = useNavigate();
  const deadlineStatus = getDeadlineStatus(subsidy.deadline);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{getSubsidyTitle(subsidy)}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{getSubsidyDescription(subsidy)}</p>
        </div>
        {showMatchScore && (
          <Badge 
            variant={subsidy.matchConfidence > 70 ? 'default' : 'secondary'}
            className="ml-2"
          >
            {subsidy.matchConfidence}% match
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {subsidy.sector && (
          <Badge variant="outline" className="text-xs">
            {getSectorDisplayString(subsidy.sector)}
          </Badge>
        )}
        {subsidy.funding_type && (
          <Badge variant="outline" className="text-xs">
            {formatFilterLabel(subsidy.funding_type)}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        {subsidy.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className={`w-4 h-4 ${deadlineStatus.urgent ? 'text-red-500' : ''}`} />
            <span className={deadlineStatus.urgent ? 'text-red-600 font-medium' : ''}>
              {deadlineStatus.status}
            </span>
          </div>
        )}
        {subsidy.region && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{getRegionDisplay(subsidy.region)}</span>
          </div>
        )}
        {subsidy.amount && (
          <div className="flex items-center gap-1">
            <Euro className="w-4 h-4" />
            <span>{formatFundingAmount(subsidy.amount)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="flex-1"
          onClick={() => navigate(`/subsidy/${subsidy.id}`)}
        >
          View Details
        </Button>
      </div>
    </Card>
  );
};

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  searchQuery,
  onSearchQueryChange,
  showFilters,
  onToggleFilters,
  subsidies,
  totalCount,
  filteredCount,
  loading,
  error,
  farmId,
  onClearFilters
}) => {
  const navigate = useNavigate();
  if (error) {
    return (
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search Subsidies"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFilters}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <EmptySubsidyState 
            type="error"
            error={error}
            onRetry={() => navigate(0)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search Subsidies"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-8"
            />
            {searchQuery && (
              <button 
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-700"
                onClick={() => onSearchQueryChange('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFilters}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Search Results</h2>
          <div className="text-sm text-gray-500">
            Showing {filteredCount} of {totalCount} subsidies
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <SubsidyLoadingCard key={index} />
            ))}
          </div>
        ) : subsidies.length === 0 ? (
          <EmptySubsidyState 
            type={totalCount === 0 ? 'no-data' : 'no-results'}
            searchQuery={searchQuery}
            onClearFilters={onClearFilters}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {subsidies.map((subsidy) => (
              <SubsidyCard 
                key={subsidy.id} 
                subsidy={subsidy} 
                showMatchScore={!!farmId} // Only show match score if farm context exists
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchResultsPanel;
