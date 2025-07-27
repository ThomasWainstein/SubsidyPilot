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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">Failed to load dashboard metrics</p>
        </CardContent>
      </Card>
    );
  }

  const {
    totalSubsidyMatches = 0,
    newMatches = 0,
    expiringMatches = 0,
    applicationCount = 0,
    activeApplications = 0,
    approvedApplications = 0,
    topMatches = [],
    urgentDeadlines = []
  } = metrics || {};

  return (
    <div className="space-y-6 mb-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Farms */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farmCount}</div>
            <p className="text-xs text-muted-foreground">
              Active farm profiles
            </p>
          </CardContent>
        </Card>

        {/* Subsidy Matches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subsidy Matches</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubsidyMatches}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {newMatches > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {newMatches} new
                </Badge>
              )}
              {expiringMatches > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {expiringMatches} expiring
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applicationCount}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{activeApplications} active</span>
              <span>•</span>
              <span>{approvedApplications} approved</span>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {applicationCount > 0 ? Math.round((approvedApplications / applicationCount) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Application approval rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Subsidy Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top Subsidy Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMatches.length > 0 ? (
              <div className="space-y-3">
                {topMatches.slice(0, 3).map((match: any, index: number) => {
                  const deadlineStatus = getDeadlineStatus(match.deadline);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{match.title || 'Untitled Subsidy'}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFundingAmount(match.amount)} • {match.farmName}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          variant={deadlineStatus.urgent ? 'destructive' : 'secondary'} 
                          className="text-xs"
                        >
                          {deadlineStatus.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {match.confidence}% match
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/subsidies')}
                  className="w-full mt-3"
                >
                  View All Matches
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No subsidy matches found</p>
                <p className="text-xs text-muted-foreground mt-1">Complete your farm profiles to see matches</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Urgent Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {urgentDeadlines.length > 0 ? (
              <div className="space-y-3">
                {urgentDeadlines.slice(0, 3).map((deadline: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{deadline.title}</p>
                      <p className="text-xs text-muted-foreground">{deadline.farmName}</p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={deadline.daysLeft <= 3 ? 'destructive' : 'default'} 
                        className="text-xs"
                      >
                        {deadline.daysLeft} days left
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(deadline.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/applications')}
                  className="w-full mt-3"
                >
                  View All Applications
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No urgent deadlines</p>
                <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;