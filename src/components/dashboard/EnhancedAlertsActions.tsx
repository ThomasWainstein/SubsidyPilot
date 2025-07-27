import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  CheckCircle, 
  Calendar,
  TrendingUp,
  Bell,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAlerts } from '@/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedAlertsActionsProps {
  farmIds: string[];
}

const EnhancedAlertsActions: React.FC<EnhancedAlertsActionsProps> = ({ farmIds }) => {
  const navigate = useNavigate();
  const { data: alerts, isLoading, dismissAlert } = useAlerts(farmIds);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alerts & Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950';
      case 'medium':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950';
    }
  };

  const handleAlertAction = (alert: any) => {
    switch (alert.type) {
      case 'missing_document':
        navigate(`/farm/${alert.farmId}#documents`);
        break;
      case 'expiring_deadline':
        navigate(`/applications`);
        break;
      case 'new_subsidy_match':
        navigate(`/farm/${alert.farmId}#subsidies`);
        break;
      case 'profile_incomplete':
        navigate(`/farm/${alert.farmId}/edit`);
        break;
      default:
        navigate(`/farm/${alert.farmId}`);
    }
  };

  const urgentAlerts = alerts?.filter(alert => alert.priority === 'high') || [];
  const mediumAlerts = alerts?.filter(alert => alert.priority === 'medium') || [];
  const lowAlerts = alerts?.filter(alert => alert.priority === 'low') || [];

  return (
    <div className="space-y-6">
      {/* Alerts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alerts & Actions
            </div>
            {alerts && alerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No urgent actions needed</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {/* High Priority Alerts */}
              {urgentAlerts.map((alert, index) => (
                <div 
                  key={`high-${index}`}
                  className={`border-l-4 p-3 rounded-r-lg ${getPriorityColor('high')} cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() => handleAlertAction(alert)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getPriorityIcon('high')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200 truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                          {alert.description}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          {alert.farmName} • {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Medium Priority Alerts */}
              {mediumAlerts.map((alert, index) => (
                <div 
                  key={`medium-${index}`}
                  className={`border-l-4 p-3 rounded-r-lg ${getPriorityColor('medium')} cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() => handleAlertAction(alert)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getPriorityIcon('medium')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200 truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                          {alert.description}
                        </p>
                        <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                          {alert.farmName} • {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      className="h-6 w-6 p-0 text-orange-500 hover:text-orange-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Low Priority Alerts */}
              {lowAlerts.slice(0, 3).map((alert, index) => (
                <div 
                  key={`low-${index}`}
                  className={`border-l-4 p-3 rounded-r-lg ${getPriorityColor('low')} cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() => handleAlertAction(alert)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getPriorityIcon('low')}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 truncate">
                          {alert.title}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          {alert.description}
                        </p>
                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                          {alert.farmName} • {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {lowAlerts.length > 3 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/alerts')}
                  className="w-full mt-2"
                >
                  View {lowAlerts.length - 3} more alerts
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/farm/new')}
            className="w-full justify-start"
          >
            <FileText className="h-4 w-4 mr-2" />
            Add New Farm
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/subsidies')}
            className="w-full justify-start"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Browse Subsidies
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/applications')}
            className="w-full justify-start"
          >
            <Calendar className="h-4 w-4 mr-2" />
            View Applications
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAlertsActions;