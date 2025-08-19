import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Euro,
  FileCheck,
  Calendar
} from 'lucide-react';

interface FarmStatusOverviewProps {
  farms: Array<{
    id: string;
    name: string;
    status?: string;
    total_hectares?: number | null;
    created_at: string;
    updated_at?: string;
  }>;
}

interface StatusSummary {
  complete: number;
  needsAttention: number;
  inProgress: number;
  totalHectares: number;
  avgFarmSize: number;
  recentlyUpdated: number;
}

const FarmStatusOverview: React.FC<FarmStatusOverviewProps> = ({ farms }) => {
  const statusSummary: StatusSummary = React.useMemo(() => {
    const summary = {
      complete: 0,
      needsAttention: 0,
      inProgress: 0,
      totalHectares: 0,
      avgFarmSize: 0,
      recentlyUpdated: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    farms.forEach(farm => {
      // Count status types (using real data only)
      switch (farm.status) {
        case 'Profile Complete':
          summary.complete++;
          break;
        case 'Incomplete':
          summary.needsAttention++;
          break;
        case 'Pending':
          summary.inProgress++;
          break;
        default:
          summary.complete++; // Default to complete for active farms
      }

      // Calculate real hectares if available
      if (farm.total_hectares && farm.total_hectares > 0) {
        summary.totalHectares += farm.total_hectares;
      }

      // Check if recently updated (real data)
      const updatedDate = new Date(farm.updated_at || farm.created_at);
      if (updatedDate > oneWeekAgo) {
        summary.recentlyUpdated++;
      }
    });

    // Calculate average only from farms with actual hectare data
    const farmsWithHectares = farms.filter(f => f.total_hectares && f.total_hectares > 0);
    summary.avgFarmSize = farmsWithHectares.length > 0 
      ? summary.totalHectares / farmsWithHectares.length 
      : 0;

    return summary;
  }, [farms]);

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'attention':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'complete':
        return 'text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'attention':
        return 'text-orange-800 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      case 'progress':
        return 'text-blue-800 bg-blue-100 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'text-gray-800 bg-gray-100 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (farms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Quick Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Farm Portfolio Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon('complete')}
                <span className="text-sm font-medium">Ready</span>
              </div>
              <Badge className={getStatusColor('complete')}>
                {statusSummary.complete}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon('attention')}
                <span className="text-sm font-medium">Needs Attention</span>
              </div>
              <Badge className={getStatusColor('attention')}>
                {statusSummary.needsAttention}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center gap-2">
                {getStatusIcon('progress')}
                <span className="text-sm font-medium">In Progress</span>
              </div>
              <Badge className={getStatusColor('progress')}>
                {statusSummary.inProgress}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Farm Metrics - Only show if we have real data */}
      {(statusSummary.totalHectares > 0 || statusSummary.recentlyUpdated > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {statusSummary.totalHectares > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Total Land Area
                  </div>
                  <div className="text-2xl font-bold">
                    {statusSummary.totalHectares.toLocaleString()} ha
                  </div>
                  {statusSummary.avgFarmSize > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Avg: {Math.round(statusSummary.avgFarmSize)} ha per farm
                    </div>
                  )}
                </div>
              )}
              
              {statusSummary.recentlyUpdated > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Recent Activity
                  </div>
                  <div className="text-2xl font-bold">
                    {statusSummary.recentlyUpdated}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    farms updated this week
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FarmStatusOverview;