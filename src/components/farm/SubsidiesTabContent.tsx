
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useFarm } from '@/hooks/useFarms';
import { useSubsidyFiltering } from '@/hooks/useSubsidyFiltering';
import SubsidyHeader from './subsidy/SubsidyHeader';
import SubsidyEmptyState from './subsidy/SubsidyEmptyState';
import SubsidyAddDialog from './subsidy/SubsidyAddDialog';
import SubsidyLoadingState from './subsidy/SubsidyLoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Euro, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SubsidiesTabContentProps {
  farmId: string;
}

const SubsidyCard = ({ subsidy }: { subsidy: any }) => {
  const getTitle = () => {
    if (typeof subsidy.title === 'object' && subsidy.title) {
      return subsidy.title.en || subsidy.title.ro || Object.values(subsidy.title)[0] || 'Untitled';
    }
    return subsidy.title || 'Untitled';
  };

  const getDescription = () => {
    if (typeof subsidy.description === 'object' && subsidy.description) {
      return subsidy.description.en || subsidy.description.ro || Object.values(subsidy.description)[0] || 'No description';
    }
    return subsidy.description || 'No description';
  };

  return (
    <Card className="p-3 md:p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base md:text-lg mb-1 line-clamp-2">{getTitle()}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm line-clamp-2">{getDescription()}</p>
          </div>
          <Badge 
            variant={subsidy.matchConfidence > 70 ? 'default' : 'secondary'}
            className="self-start flex-shrink-0 text-xs"
          >
            {subsidy.matchConfidence}% match
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1 md:gap-2">
          {subsidy.categories?.slice(0, 3).map((category: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {category}
            </Badge>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
          {subsidy.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="truncate">{new Date(subsidy.deadline).toLocaleDateString()}</span>
            </div>
          )}
          {subsidy.region && subsidy.region.length > 0 && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="truncate">{subsidy.region.slice(0, 2).join(', ')}</span>
            </div>
          )}
          {(subsidy.amount_min || subsidy.amount_max) && (
            <div className="flex items-center gap-1">
              <Euro className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
              <span className="truncate">
                {subsidy.amount_min && subsidy.amount_max
                  ? `€${subsidy.amount_min.toLocaleString()} - €${subsidy.amount_max.toLocaleString()}`
                  : subsidy.amount_min
                  ? `€${subsidy.amount_min.toLocaleString()}+`
                  : `Up to €${subsidy.amount_max?.toLocaleString()}`
                }
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" className="flex-1 min-h-[36px] text-xs md:text-sm">
            View Details
          </Button>
          <Button size="sm" variant="outline" className="flex-1 min-h-[36px] text-xs md:text-sm">
            Apply
          </Button>
        </div>
      </div>
    </Card>
  );
};

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { data: farm } = useFarm(farmId);
  
  // Use the new filtering hook with minimal filters for farm tab
  const { 
    subsidies: matchingSubsidies, 
    loading, 
    error, 
    totalCount 
  } = useSubsidyFiltering(farmId, {
    confidenceFilter: [30], // Only show subsidies with >30% match
    regions: [],
    eligibleCountry: '',
    farmingTypes: [],
    fundingSources: [],
    fundingInstruments: [],
    documentsRequired: [],
    applicationFormats: [],
    sustainabilityGoals: [],
    deadlineStatuses: ['open'], // Only show open subsidies
  }, '');

  if (loading) {
    return <SubsidyLoadingState />;
  }

  if (error) {
    return (
      <Card>
        <SubsidyHeader onAddSubsidy={() => setDialogOpen(true)} />
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 text-sm md:text-base">Error loading subsidies: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <SubsidyHeader onAddSubsidy={() => setDialogOpen(true)} />
      <CardContent className="p-4 md:p-6">
        {!matchingSubsidies || matchingSubsidies.length === 0 ? (
          <SubsidyEmptyState />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-base md:text-lg font-semibold">
                Recommended Subsidies ({matchingSubsidies.length})
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <Badge variant="secondary" className="text-xs">
                  Based on farm profile
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/subsidies/${farmId}`)}
                  className="flex items-center gap-2 min-h-[36px] text-xs md:text-sm"
                >
                  <Search className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Advanced Search</span>
                  <span className="sm:hidden">Search</span>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 md:gap-4 grid-cols-1 lg:grid-cols-2">
              {matchingSubsidies.slice(0, 6).map((subsidy) => (
                <SubsidyCard key={subsidy.id} subsidy={subsidy} />
              ))}
            </div>
            {matchingSubsidies.length > 6 && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/subsidies/${farmId}`)}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  View All {totalCount} Subsidies
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <SubsidyAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        farmId={farmId}
        farmRegion={farm?.department || ''}
        onAddSubsidy={() => setDialogOpen(false)}
      />
    </Card>
  );
};
