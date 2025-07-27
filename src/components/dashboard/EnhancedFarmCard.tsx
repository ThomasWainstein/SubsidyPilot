import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Calendar, 
  Eye, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  FileText,
  Euro
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarmMetrics } from '@/hooks/useFarmMetrics';
import { formatFundingAmount } from '@/utils/subsidyFormatting';

interface Farm {
  id: string;
  name: string;
  address: string;
  department?: string | null;
  total_hectares?: number | null;
  created_at: string;
  updated_at?: string | null;
  updatedAt?: string;
  size?: string;
  staff?: number;
  status?: 'Profile Complete' | 'Incomplete' | 'Pending';
  region?: string;
  tags?: string[];
  certifications?: string[];
  irrigationMethod?: string;
  crops?: string[];
  revenue?: string;
  activities?: string[];
  carbonScore?: number;
  software?: string[];
}

interface EnhancedFarmCardProps {
  farm: Farm;
}

const EnhancedFarmCard: React.FC<EnhancedFarmCardProps> = ({ farm }) => {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = useFarmMetrics(farm.id);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Profile Complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Incomplete':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUrgencyLevel = () => {
    if (!metrics) return null;
    
    const { urgentDeadlines = 0, missingDocuments = 0, expiringMatches = 0 } = metrics;
    const totalUrgent = urgentDeadlines + missingDocuments + expiringMatches;
    
    if (totalUrgent === 0) return null;
    if (totalUrgent >= 3) return 'high';
    if (totalUrgent >= 2) return 'medium';
    return 'low';
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 relative">
      {urgencyLevel && (
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
          urgencyLevel === 'high' ? 'bg-red-500' : 
          urgencyLevel === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
        }`} />
      )}
      
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {farm.name}
          </CardTitle>
          <Badge className={getStatusColor(farm.status)}>
            {farm.status || 'Active'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>{farm.address}</p>
            {farm.department && (
              <p className="text-xs text-gray-500">{farm.department}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Size:</span>
            <p className="font-medium">
              {farm.total_hectares ? `${farm.total_hectares} ha` : farm.size || 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Staff:</span>
            <p className="font-medium">{farm.staff || 0}</p>
          </div>
        </div>

        {/* Real Subsidy Metrics - Only show if data exists */}
        {!isLoading && metrics && (metrics.urgentDeadlines > 0 || metrics.missingDocuments > 0) && (
          <div className="space-y-2 border-t pt-3">
            {metrics.urgentDeadlines > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle size={12} className="text-red-500" />
                <Badge variant="destructive" className="text-xs">
                  {metrics.urgentDeadlines} urgent deadline{metrics.urgentDeadlines > 1 ? 's' : ''}
                </Badge>
              </div>
            )}
            {metrics.missingDocuments > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <FileText size={12} className="text-orange-500" />
                <Badge variant="outline" className="text-xs">
                  {metrics.missingDocuments} missing doc{metrics.missingDocuments > 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
        )}

        {farm.tags && farm.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {farm.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {farm.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{farm.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar size={14} />
          <span>Updated {formatDate(farm.updated_at || farm.updatedAt || farm.created_at)}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/farm/${farm.id}`)}
            className="flex-1"
          >
            <Eye size={16} className="mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedFarmCard;