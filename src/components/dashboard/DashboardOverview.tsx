import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Calendar, 
  Euro, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { formatFundingAmount, getDeadlineStatus } from '@/utils/subsidyFormatting';

interface DashboardOverviewProps {
  farmCount: number;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({ farmCount }) => {
  const navigate = useNavigate();
  const { data: metrics, isLoading, error } = useDashboardMetrics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    // Don't show error prominently - just hide the section
    return null;
  }

  const {
    applicationCount = 0,
    activeApplications = 0,
    approvedApplications = 0,
    urgentDeadlines = []
  } = metrics || {};

  // Only show real data - no fake metrics
  const hasRealApplicationData = applicationCount > 0;
  const hasUrgentDeadlines = urgentDeadlines.length > 0;

  return (
    <div className="space-y-4">
      {/* Applications Summary - Only if real data exists */}
      {hasRealApplicationData && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{applicationCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Active:</span>
              <span className="font-medium">{activeApplications}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Approved:</span>
              <span className="font-medium text-green-600">{approvedApplications}</span>
            </div>
            {applicationCount > 0 && (
              <div className="flex justify-between text-sm pt-1 border-t">
                <span className="text-muted-foreground">Success Rate:</span>
                <span className="font-medium">
                  {Math.round((approvedApplications / applicationCount) * 100)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Urgent Deadlines - Only if real data exists */}
      {hasUrgentDeadlines && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Urgent Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentDeadlines.slice(0, 2).map((deadline: any, index: number) => (
                <div key={index} className="text-sm">
                  <p className="font-medium truncate">{deadline.title}</p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{deadline.farmName}</span>
                    <Badge 
                      variant={deadline.daysLeft <= 3 ? 'destructive' : 'default'} 
                      className="text-xs"
                    >
                      {deadline.daysLeft} days
                    </Badge>
                  </div>
                </div>
              ))}
              {urgentDeadlines.length > 2 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/applications')}
                  className="w-full mt-2"
                >
                  View All ({urgentDeadlines.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!hasRealApplicationData && !hasUrgentDeadlines && (
        <Card>
          <CardContent className="text-center py-6">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No application data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start by completing your farm profiles
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardOverview;