import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Calendar, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface Farm {
  id: string;
  name: string;
  address: string;
  department?: string | null;
  total_hectares?: number | null;
  created_at: string;
  updated_at?: string | null;
  status?: 'Profile Complete' | 'Incomplete' | 'Pending';
  tags?: string[];
}

interface ProfessionalFarmCardProps {
  farm: Farm;
  hasUrgentIssues?: boolean;
  documentsComplete?: boolean;
  fundingOpportunities?: number;
}

const ProfessionalFarmCard: React.FC<ProfessionalFarmCardProps> = ({ 
  farm, 
  hasUrgentIssues = false,
  documentsComplete = true,
  fundingOpportunities = 0
}) => {
  const navigate = useNavigate();

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'Profile Complete':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Complete'
        };
      case 'Incomplete':
        return {
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          icon: <AlertTriangle className="h-3 w-3" />,
          label: 'Needs Update'
        };
      case 'Pending':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          icon: <Clock className="h-3 w-3" />,
          label: 'In Progress'
        };
      default:
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          icon: <CheckCircle className="h-3 w-3" />,
          label: 'Active'
        };
    }
  };

  const statusConfig = getStatusConfig(farm.status);
  const lastUpdate = formatDistanceToNow(new Date(farm.updated_at || farm.created_at), { addSuffix: true });

  const handleViewDetails = () => {
    navigate(`/farm/${farm.id}`);
  };

  const handleQuickAction = () => {
    if (hasUrgentIssues) {
      navigate(`/farm/${farm.id}#issues`);
    } else if (!documentsComplete) {
      navigate(`/farm/${farm.id}#documents`);
    } else if (fundingOpportunities > 0) {
      navigate(`/farm/${farm.id}#subsidies`);
    } else {
      navigate(`/farm/${farm.id}`);
    }
  };

  const getQuickActionLabel = () => {
    if (hasUrgentIssues) return 'Fix Issues';
    if (!documentsComplete) return 'Complete Docs';
    if (fundingOpportunities > 0) return 'View Funding';
    return 'View Details';
  };

  const getQuickActionVariant = () => {
    if (hasUrgentIssues) return 'destructive';
    if (!documentsComplete) return 'outline';
    if (fundingOpportunities > 0) return 'default';
    return 'outline';
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 relative flex flex-col h-full border-l-4 border-l-transparent hover:border-l-primary">
      {/* Priority indicator */}
      {hasUrgentIssues && (
        <div className="absolute top-3 right-3">
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Urgent
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground truncate">
              {farm.name}
            </CardTitle>
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {farm.department || 'Location not specified'}
              </span>
            </div>
          </div>
          <Badge className={`${statusConfig.color} flex items-center gap-1 ml-2`}>
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Farm details - only show if real data exists */}
        <div className="space-y-3 flex-1">
          {farm.total_hectares && farm.total_hectares > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Farm Size:</span>
              <span className="font-medium">{farm.total_hectares} hectares</span>
            </div>
          )}

          {/* Status indicators */}
          <div className="space-y-2">
            {hasUrgentIssues && (
              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded-md">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  Action required - compliance issues
                </span>
              </div>
            )}
            
            {!documentsComplete && !hasUrgentIssues && (
              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-950 rounded-md">
                <FileText className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800 dark:text-orange-200">
                  Documents incomplete
                </span>
              </div>
            )}
            
            {fundingOpportunities > 0 && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  {fundingOpportunities} new opportunities
                </span>
              </div>
            )}
          </div>

          {/* Last activity */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Updated {lastUpdate}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            variant={getQuickActionVariant() as any}
            size="sm" 
            onClick={handleQuickAction}
            className="flex-1"
          >
            {getQuickActionLabel()}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewDetails}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfessionalFarmCard;