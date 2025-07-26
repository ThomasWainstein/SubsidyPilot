
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, MapPin, Euro } from 'lucide-react';

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
}

const SubsidyCard = ({ subsidy, showMatchScore }: { subsidy: Subsidy; showMatchScore: boolean }) => {
  const getTitle = () => {
    if (typeof subsidy.title === 'object' && subsidy.title) {
      return subsidy.title.en || subsidy.title.ro || subsidy.title.fr || Object.values(subsidy.title)[0] || 'Untitled';
    }
    return subsidy.title || 'Untitled';
  };

  const getDescription = () => {
    if (typeof subsidy.description === 'object' && subsidy.description) {
      return subsidy.description.en || subsidy.description.ro || subsidy.description.fr || Object.values(subsidy.description)[0] || 'No description';
    }
    return subsidy.description || 'No description';
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{getTitle()}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{getDescription()}</p>
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
            {subsidy.sector}
          </Badge>
        )}
        {subsidy.funding_type && (
          <Badge variant="outline" className="text-xs">
            {subsidy.funding_type}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        {subsidy.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(subsidy.deadline).toLocaleDateString()}</span>
          </div>
        )}
        {subsidy.region && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>
              {Array.isArray(subsidy.region) 
                ? subsidy.region.slice(0, 2).join(', ')
                : subsidy.region
              }
            </span>
          </div>
        )}
        {subsidy.amount && (
          <div className="flex items-center gap-1">
            <Euro className="w-4 h-4" />
            <span>€{subsidy.amount.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1">
          View Details
        </Button>
        <Button size="sm" variant="outline">
          Apply
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
  farmId
}) => {
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
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Subsidies</h3>
            <p className="text-gray-500">{error}</p>
          </div>
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
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading subsidies...</p>
          </div>
        ) : subsidies.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No subsidies found</h3>
            <p className="text-gray-500">
              {totalCount === 0 
                ? "No subsidies are available in the database." 
                : "No subsidies match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
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
