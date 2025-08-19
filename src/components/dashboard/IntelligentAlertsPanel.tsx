import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Bell,
  Euro,
  FileText,
  Calendar,
  X,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface IntelligentAlert {
  id: string;
  type: 'urgent_deadline' | 'funding_opportunity' | 'document_missing' | 'compliance_issue' | 'application_ready';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  farmName: string;
  farmId: string;
  actionLabel: string;
  deadline?: Date;
  fundingAmount?: number;
  documentsRequired?: string[];
  opportunityType?: string;
  createdAt: Date;
}

interface IntelligentAlertsPanelProps {
  farmIds: string[];
}

// Mock data based on real farm scenarios - this would come from API
const generateIntelligentAlerts = (farmIds: string[]): IntelligentAlert[] => {
  const baseAlerts: IntelligentAlert[] = [
    {
      id: '1',
      type: 'urgent_deadline',
      priority: 'critical',
      title: 'Tax Documents Due in 3 Days',
      description: 'Required for €45,000 organic transition subsidy application',
      farmName: 'Green Valley Farm',
      farmId: farmIds[0] || 'demo-1',
      actionLabel: 'Upload Tax Forms',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      fundingAmount: 45000,
      documentsRequired: ['Annual tax returns', 'Income statement'],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '2',
      type: 'funding_opportunity',
      priority: 'high',
      title: 'New Livestock Modernization Grant Available',
      description: 'Perfect match for your dairy operations - 60% cost coverage',
      farmName: 'Riverside Dairy',
      farmId: farmIds[1] || 'demo-2',
      actionLabel: 'Check Eligibility',
      fundingAmount: 85000,
      opportunityType: 'Equipment & Infrastructure',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    },
    {
      id: '3',
      type: 'document_missing',
      priority: 'medium',
      title: 'Soil Analysis Report Needed',
      description: 'Complete profile to unlock precision agriculture funding',
      farmName: 'North Field Operations',
      farmId: farmIds[2] || 'demo-3',
      actionLabel: 'Schedule Soil Test',
      documentsRequired: ['Soil composition analysis', 'pH testing results'],
      fundingAmount: 25000,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      id: '4',
      type: 'application_ready',
      priority: 'high',
      title: 'Ready to Submit: Renewable Energy Grant',
      description: 'All documents complete - €120K solar panel installation',
      farmName: 'Sunrise Ranch',
      farmId: farmIds[0] || 'demo-1',
      actionLabel: 'Submit Application',
      fundingAmount: 120000,
      opportunityType: 'Renewable Energy',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
    },
    {
      id: '5',
      type: 'compliance_issue',
      priority: 'medium',
      title: 'Farm Certification Expires in 30 Days',
      description: 'Organic certification renewal required for continued eligibility',
      farmName: 'Green Valley Farm',
      farmId: farmIds[0] || 'demo-1',
      actionLabel: 'Start Renewal Process',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
    }
  ];

  // Only return alerts for farms that actually exist
  return baseAlerts.filter(alert => farmIds.includes(alert.farmId) || farmIds.length === 0);
};

const IntelligentAlertsPanel: React.FC<IntelligentAlertsPanelProps> = ({ farmIds }) => {
  const navigate = useNavigate();
  const alerts = generateIntelligentAlerts(farmIds);

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'border-l-red-600 bg-red-50 dark:bg-red-950',
          textColor: 'text-red-800 dark:text-red-200',
          badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          urgencyText: '🔴 CRITICAL'
        };
      case 'high':
        return {
          icon: <TrendingUp className="h-4 w-4" />,
          color: 'border-l-orange-600 bg-orange-50 dark:bg-orange-950',
          textColor: 'text-orange-800 dark:text-orange-200',
          badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          urgencyText: '🟠 HIGH'
        };
      case 'medium':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'border-l-blue-600 bg-blue-50 dark:bg-blue-950',
          textColor: 'text-blue-800 dark:text-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          urgencyText: '🔵 MEDIUM'
        };
      default:
        return {
          icon: <FileText className="h-4 w-4" />,
          color: 'border-l-gray-400 bg-gray-50 dark:bg-gray-950',
          textColor: 'text-gray-800 dark:text-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          urgencyText: '⚪ LOW'
        };
    }
  };

  const handleAlertAction = (alert: IntelligentAlert) => {
    switch (alert.type) {
      case 'urgent_deadline':
      case 'document_missing':
        navigate(`/farm/${alert.farmId}#documents`);
        break;
      case 'funding_opportunity':
      case 'application_ready':
        navigate(`/farm/${alert.farmId}#subsidies`);
        break;
      case 'compliance_issue':
        navigate(`/farm/${alert.farmId}#compliance`);
        break;
      default:
        navigate(`/farm/${alert.farmId}`);
    }
  };

  const formatDeadline = (deadline: Date) => {
    const days = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return `Due in ${days} days`;
    return `Due ${deadline.toLocaleDateString()}`;
  };

  // Separate alerts by priority
  const criticalAlerts = alerts.filter(a => a.priority === 'critical');
  const highAlerts = alerts.filter(a => a.priority === 'high');
  const mediumAlerts = alerts.filter(a => a.priority === 'medium');

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Intelligent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">All farms optimized!</p>
            <p className="text-xs text-muted-foreground mt-1">No urgent actions needed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Intelligent Alerts
          </div>
          <Badge variant="outline" className="text-xs">
            {alerts.length} active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {/* Critical Alerts - Always show first */}
          {criticalAlerts.map((alert) => {
            const config = getPriorityConfig(alert.priority);
            return (
              <div 
                key={alert.id}
                className={`border-l-4 p-4 rounded-r-lg ${config.color} cursor-pointer hover:shadow-sm transition-shadow`}
                onClick={() => handleAlertAction(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={config.badgeColor} variant="secondary">
                        {config.urgencyText}
                      </Badge>
                      {alert.deadline && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDeadline(alert.deadline)}
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <h4 className={`font-semibold text-sm ${config.textColor}`}>
                        {alert.title}
                      </h4>
                      <p className={`text-xs mt-1 ${config.textColor} opacity-90`}>
                        {alert.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-muted-foreground">
                          {alert.farmName}
                        </span>
                        {alert.fundingAmount && (
                          <div className="flex items-center gap-1">
                            <Euro className="h-3 w-3 text-green-600" />
                            <span className="text-xs font-semibold text-green-600">
                              €{alert.fundingAmount.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        {alert.actionLabel}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* High Priority Alerts */}
          {highAlerts.map((alert) => {
            const config = getPriorityConfig(alert.priority);
            return (
              <div 
                key={alert.id}
                className={`border-l-4 p-3 rounded-r-lg ${config.color} cursor-pointer hover:shadow-sm transition-shadow`}
                onClick={() => handleAlertAction(alert)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={config.badgeColor} variant="secondary">
                        {config.urgencyText}
                      </Badge>
                      {alert.opportunityType && (
                        <Badge variant="outline" className="text-xs">
                          {alert.opportunityType}
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <h4 className={`font-medium text-sm ${config.textColor}`}>
                        {alert.title}
                      </h4>
                      <p className={`text-xs mt-1 ${config.textColor} opacity-90`}>
                        {alert.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {alert.farmName} • {formatDistanceToNow(alert.createdAt, { addSuffix: true })}
                      </span>
                      {alert.fundingAmount && (
                        <div className="flex items-center gap-1">
                          <Euro className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-semibold text-green-600">
                            €{alert.fundingAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Medium Priority Alerts - Limit to 2 to avoid clutter */}
          {mediumAlerts.slice(0, 2).map((alert) => {
            const config = getPriorityConfig(alert.priority);
            return (
              <div 
                key={alert.id}
                className={`border-l-4 p-3 rounded-r-lg ${config.color} cursor-pointer hover:shadow-sm transition-shadow`}
                onClick={() => handleAlertAction(alert)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm ${config.textColor}`}>
                      {alert.title}
                    </h4>
                    <p className={`text-xs mt-1 ${config.textColor} opacity-80`}>
                      {alert.farmName} • {alert.description}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs">
                    {alert.actionLabel}
                  </Button>
                </div>
              </div>
            );
          })}

          {mediumAlerts.length > 2 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/alerts')}
              className="w-full mt-2"
            >
              View {mediumAlerts.length - 2} more alerts
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IntelligentAlertsPanel;