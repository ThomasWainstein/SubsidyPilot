
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useMatchingSubsidies } from '@/hooks/useSubsidies';
import { useFarm } from '@/hooks/useFarms';
import SubsidyHeader from './subsidy/SubsidyHeader';
import SubsidyEmptyState from './subsidy/SubsidyEmptyState';
import SubsidyAddDialog from './subsidy/SubsidyAddDialog';
import SubsidyLoadingState from './subsidy/SubsidyLoadingState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Euro } from 'lucide-react';

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
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{getTitle()}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{getDescription()}</p>
        </div>
        <Badge 
          variant={subsidy.matchConfidence > 70 ? 'default' : 'secondary'}
          className="ml-2"
        >
          {subsidy.matchConfidence}% match
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {subsidy.categories?.slice(0, 3).map((category: string, index: number) => (
          <Badge key={index} variant="outline" className="text-xs">
            {category}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
        {subsidy.deadline && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(subsidy.deadline).toLocaleDateString()}</span>
          </div>
        )}
        {subsidy.region && subsidy.region.length > 0 && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{subsidy.region.slice(0, 2).join(', ')}</span>
          </div>
        )}
        {(subsidy.amount_min || subsidy.amount_max) && (
          <div className="flex items-center gap-1">
            <Euro className="w-4 h-4" />
            <span>
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

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: farm } = useFarm(farmId);
  const { data: matchingSubsidies, isLoading, error } = useMatchingSubsidies(farmId);

  if (isLoading) {
    return <SubsidyLoadingState />;
  }

  if (error) {
    return (
      <Card>
        <SubsidyHeader onAddSubsidy={() => setDialogOpen(true)} />
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading subsidies: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <SubsidyHeader onAddSubsidy={() => setDialogOpen(true)} />
      <CardContent>
        {!matchingSubsidies || matchingSubsidies.length === 0 ? (
          <SubsidyEmptyState />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Recommended Subsidies ({matchingSubsidies.length})
              </h3>
              <Badge variant="secondary">
                Based on farm profile
              </Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {matchingSubsidies.map((subsidy) => (
                <SubsidyCard key={subsidy.id} subsidy={subsidy} />
              ))}
            </div>
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
