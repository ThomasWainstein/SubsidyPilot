import React from 'react';
import { Search, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptySubsidyStateProps {
  type: 'no-data' | 'no-results' | 'error';
  searchQuery?: string;
  onClearFilters?: () => void;
  onRetry?: () => void;
  error?: string;
}

const EmptySubsidyState: React.FC<EmptySubsidyStateProps> = ({
  type,
  searchQuery,
  onClearFilters,
  onRetry,
  error
}) => {
  const getContent = () => {
    switch (type) {
      case 'no-data':
        return {
          icon: <Search className="w-12 h-12 text-gray-400" />,
          title: 'No Subsidies Available',
          description: 'No subsidies are currently available in the database. Check back later for new opportunities.',
          action: null
        };
      
      case 'no-results':
        return {
          icon: <Filter className="w-12 h-12 text-gray-400" />,
          title: 'No Matching Subsidies',
          description: searchQuery 
            ? `No subsidies match your search for "${searchQuery}" and current filters.`
            : 'No subsidies match your current filter criteria.',
          action: onClearFilters ? (
            <Button onClick={onClearFilters} variant="outline">
              Clear All Filters
            </Button>
          ) : null
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-400" />,
          title: 'Error Loading Subsidies',
          description: error || 'Unable to load subsidy data. Please try again.',
          action: onRetry ? (
            <Button onClick={onRetry} variant="outline">
              Try Again
            </Button>
          ) : null
        };
      
      default:
        return {
          icon: <Search className="w-12 h-12 text-gray-400" />,
          title: 'No Results',
          description: 'No results to display.',
          action: null
        };
    }
  };

  const content = getContent();

  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {content.icon}
          </div>
          <h3 className="text-lg font-medium mb-2">{content.title}</h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            {content.description}
          </p>
          {content.action}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmptySubsidyState;