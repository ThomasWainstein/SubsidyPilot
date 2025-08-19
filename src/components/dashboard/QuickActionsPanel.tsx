import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  FileText, 
  Calendar,
  Euro,
  Target,
  Zap,
  Search,
  Plus,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  priority: 'high' | 'medium' | 'low';
  fundingAmount?: number;
  timeToComplete?: string;
  farmCount?: number;
}

interface QuickActionsPanelProps {
  farmCount: number;
  hasIncompleteProfiles: boolean;
  highValueOpportunities: number;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  farmCount,
  hasIncompleteProfiles,
  highValueOpportunities
}) => {
  const navigate = useNavigate();

  const generateQuickActions = (): QuickAction[] => {
    const actions: QuickAction[] = [];

    // High priority actions based on real conditions
    if (hasIncompleteProfiles) {
      actions.push({
        id: 'complete-profiles',
        title: 'Complete Farm Profiles',
        description: 'Unlock funding opportunities by completing missing information',
        icon: <FileText className="h-4 w-4" />,
        action: () => navigate('/dashboard?filter=incomplete'),
        priority: 'high',
        farmCount: farmCount,
        timeToComplete: '15 min per farm'
      });
    }

    if (highValueOpportunities > 0) {
      actions.push({
        id: 'review-opportunities',
        title: 'Review High-Value Opportunities',
        description: `${highValueOpportunities} programs match your farm portfolio`,
        icon: <Euro className="h-4 w-4" />,
        action: () => navigate('/subsidies?sort=amount'),
        priority: 'high',
        fundingAmount: 120000,
        timeToComplete: '10 min'
      });
    }

    // Medium priority actions
    if (farmCount > 0) {
      actions.push({
        id: 'optimize-portfolio',
        title: 'Optimize Farm Portfolio',
        description: 'Run funding analysis across all your farms',
        icon: <Target className="h-4 w-4" />,
        action: () => navigate('/analytics'),
        priority: 'medium',
        timeToComplete: '20 min'
      });
    }

    actions.push({
      id: 'search-programs',
      title: 'Discover New Programs',
      description: 'Browse latest agricultural funding opportunities',
      icon: <Search className="h-4 w-4" />,
      action: () => navigate('/subsidies'),
      priority: 'medium',
      timeToComplete: '5 min'
    });

    // Add farm action if none exist
    if (farmCount === 0) {
      actions.push({
        id: 'add-first-farm',
        title: 'Add Your First Farm',
        description: 'Start your funding journey by creating a farm profile',
        icon: <Plus className="h-4 w-4" />,
        action: () => navigate('/farm/new'),
        priority: 'high',
        timeToComplete: '10 min'
      });
    } else {
      actions.push({
        id: 'add-farm',
        title: 'Add Another Farm',
        description: 'Expand your portfolio to access more funding',
        icon: <Plus className="h-4 w-4" />,
        action: () => navigate('/farm/new'),
        priority: 'low',
        timeToComplete: '10 min'
      });
    }

    actions.push({
      id: 'calendar-deadlines',
      title: 'View Application Deadlines',
      description: 'Track important dates and submission timelines',
      icon: <Calendar className="h-4 w-4" />,
      action: () => navigate('/calendar'),
      priority: 'medium',
      timeToComplete: '2 min'
    });

    return actions;
  };

  const quickActions = generateQuickActions();
  const highPriorityActions = quickActions.filter(a => a.priority === 'high');
  const mediumPriorityActions = quickActions.filter(a => a.priority === 'medium');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950';
      case 'medium': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950';
      default: return 'border-l-gray-400 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Recommended Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* High Priority Actions */}
          {highPriorityActions.map((action) => (
            <div 
              key={action.id}
              className={`border-l-4 p-3 rounded-r-lg ${getPriorityColor(action.priority)} cursor-pointer hover:shadow-sm transition-shadow`}
              onClick={action.action}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                    {action.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">
                        {action.title}
                      </h4>
                      {action.priority === 'high' && (
                        <Badge className={getPriorityBadge(action.priority)} variant="secondary">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {action.timeToComplete && (
                        <span>⏱️ {action.timeToComplete}</span>
                      )}
                      {action.fundingAmount && (
                        <span className="text-green-600 font-medium">
                          💰 Up to €{action.fundingAmount.toLocaleString()}
                        </span>
                      )}
                      {action.farmCount && (
                        <span>🏡 {action.farmCount} farms</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Medium Priority Actions - Compact view */}
          {mediumPriorityActions.slice(0, 3).map((action) => (
            <div 
              key={action.id}
              className={`border-l-4 p-2 rounded-r-lg ${getPriorityColor(action.priority)} cursor-pointer hover:shadow-sm transition-shadow`}
              onClick={action.action}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {action.icon}
                  <div>
                    <h4 className="font-medium text-sm">{action.title}</h4>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Progress indicator if actions are being completed */}
          {farmCount > 0 && !hasIncompleteProfiles && (
            <div className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950 p-3 rounded-r-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Great progress! Your farms are ready for funding.
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsPanel;