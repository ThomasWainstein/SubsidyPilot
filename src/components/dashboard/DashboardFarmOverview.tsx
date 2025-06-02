
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, MapPin, Calendar } from 'lucide-react';

interface Farm {
  id: string;
  name: string;
  address: string;
  department: string | null;
  total_hectares: number | null;
  created_at: string;
  updated_at: string;
}

interface DashboardFarmOverviewProps {
  farms: Farm[];
}

const DashboardFarmOverview = ({ farms }: DashboardFarmOverviewProps) => {
  const totalFarms = farms.length;
  const totalHectares = farms.reduce((sum, farm) => sum + (farm.total_hectares || 0), 0);
  const recentlyUpdated = farms.filter(farm => {
    const updatedDate = new Date(farm.updated_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return updatedDate > weekAgo;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalFarms}</div>
          <p className="text-xs text-muted-foreground">
            Active farm operations
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Hectares</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalHectares.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">
            Hectares under management
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentlyUpdated}</div>
          <p className="text-xs text-muted-foreground">
            Updated this week
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardFarmOverview;
