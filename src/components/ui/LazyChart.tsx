import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// 🚀 PERFORMANCE: Lazy load the Chart component to reduce initial bundle size
const Chart = lazy(() => import('./chart').then(module => ({ default: module.ChartContainer })));

interface LazyChartProps {
  config: any;
  className?: string;
  children: React.ReactElement;
}

const ChartSkeleton = () => (
  <div className="w-full h-[200px] space-y-2">
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-[150px] w-full" />
  </div>
);

export const LazyChartContainer: React.FC<LazyChartProps> = ({ config, className, children }) => {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart config={config} className={className}>
        {children}
      </Chart>
    </Suspense>
  );
};

export default LazyChartContainer;