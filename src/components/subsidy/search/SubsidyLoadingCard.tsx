import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const SubsidyLoadingCard: React.FC = () => {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-6 w-16 ml-2" />
        </div>

        {/* Badges */}
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>

        {/* Meta info */}
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
    </Card>
  );
};

export default SubsidyLoadingCard;