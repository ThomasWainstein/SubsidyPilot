import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const SubsidyDetailSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header Skeleton */}
    <div className="bg-card shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
    </div>

    {/* Hero Section Skeleton */}
    <div className="bg-gradient-to-r from-primary to-primary/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="h-6 w-16 bg-white/20" />
              <Skeleton className="h-6 w-24 bg-white/20" />
            </div>
            <Skeleton className="h-10 w-3/4 mb-3 bg-white/20" />
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="h-8 w-8 rounded bg-white/20" />
              <Skeleton className="h-6 w-40 bg-white/20" />
            </div>
            <Skeleton className="h-6 w-full max-w-3xl bg-white/20" />
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:ml-8 md:min-w-[300px]">
            <div className="text-center">
              <Skeleton className="h-8 w-24 mx-auto mb-2 bg-white/20" />
              <Skeleton className="h-4 w-32 mx-auto mb-4 bg-white/20" />
              <Skeleton className="h-4 w-28 mx-auto bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Navigation Tabs Skeleton */}
    <div className="bg-card border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-20" />
          ))}
        </div>
      </div>
    </div>

    {/* Content Skeleton */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Program Description Card */}
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>

          {/* Funding Information Card */}
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Key Information Card */}
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);