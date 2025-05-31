
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';

interface SearchResultsPanelProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  searchQuery,
  onSearchQueryChange,
  showFilters,
  onToggleFilters
}) => {
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
        <h2 className="text-xl font-semibold mb-4">Search Results</h2>

        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No subsidies available</h3>
          <p className="text-gray-500">The subsidy database is currently empty. Subsidies will be populated from real data sources.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchResultsPanel;
