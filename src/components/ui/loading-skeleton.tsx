
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const FarmCardSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex gap-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-20" />
    </div>
    <Skeleton className="h-8 w-full" />
  </div>
);

export const DocumentCardSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-5 w-32" />
    </div>
    <Skeleton className="h-4 w-24" />
    <Skeleton className="h-4 w-16" />
  </div>
);

export const SubsidyCardSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-6 w-16" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <div className="flex gap-2">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="border rounded-lg p-6 space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
    </div>
  </div>
);
