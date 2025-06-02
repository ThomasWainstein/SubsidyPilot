
import React from 'react';
import { Button } from '@/components/ui/button';

interface DashboardErrorFallbackProps {
  error?: Error;
  resetError: () => void;
}

const DashboardErrorFallback = ({ error, resetError }: DashboardErrorFallbackProps) => (
  <div className="p-4 border border-red-300 rounded-md bg-red-50">
    <p className="text-red-700 mb-2">Error loading dashboard component</p>
    {error && (
      <p className="text-red-600 text-sm mb-3">{error.message}</p>
    )}
    <Button onClick={resetError} variant="outline" size="sm">
      Try Again
    </Button>
  </div>
);

export default DashboardErrorFallback;
