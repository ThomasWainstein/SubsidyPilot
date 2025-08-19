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
  Zap,
  Euro,
  Target,
  Award,
  Beef,
  Wheat,
  Milk,
  Sprout
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
  livestock?: any; // JSON field from database
  land_use_types?: string[];
}

interface FarmIntelligenceData {
  farmType: 'livestock' | 'crops' | 'mixed' | 'dairy' | 'organic';
  primaryOperations: string[];
  fundingReadinessScore: number;
  availableOpportunities: number;
  estimatedFundingPotential: number;
  urgentIssues: number;
  complianceStatus: 'current' | 'expiring' | 'expired';
  nextRecommendedAction: string;
  recentActivity: string;
}

interface FarmIntelligenceCardProps {
  farm: Farm;
}

const FarmIntelligenceCard: React.FC<FarmIntelligenceCardProps> = ({ farm }) => {
  const navigate = useNavigate();

  // Generate intelligent insights based on real farm data
  const generateIntelligence = (farm: Farm): FarmIntelligenceData => {
    const hasLivestock = farm.livestock && Object.keys(farm.livestock).length > 0;
    const landUseTypes = farm.land_use_types || [];
    const hectares = farm.total_hectares || 0;
    
    // Determine farm type from real data
    let farmType: FarmIntelligenceData['farmType'] = 'crops';
    let primaryOperations: string[] = [];
    
    if (hasLivestock) {
      farmType = 'livestock';
      primaryOperations.push('Livestock Management');
    }
    
    if (landUseTypes.includes('organic')) {
      farmType = 'organic';
      primaryOperations.push('Organic Certification');
    }
    
    if (landUseTypes.includes('dairy')) {
      farmType = 'dairy';
      primaryOperations.push('Dairy Production');
    }
    
    if (landUseTypes.length > 1) {
      farmType = 'mixed';
    }
    
    // Add land use based operations
    landUseTypes.forEach(type => {
      if (type === 'arable_crops') primaryOperations.push('Crop Production');
      if (type === 'pasture') primaryOperations.push('Grazing Land');
      if (type === 'orchard') primaryOperations.push('Fruit Trees');
    });
    
    // Calculate funding readiness based on profile completeness
    let readinessScore = 40; // Base score
    if (farm.status === 'Profile Complete') readinessScore += 30;
    if (hectares > 0) readinessScore += 15;
    if (farm.department) readinessScore += 10;
    if (primaryOperations.length > 0) readinessScore += 5;
    
    // Estimate opportunities based on farm characteristics
    let opportunities = 1; // Base opportunity
    if (hectares > 50) opportunities += 2; // Larger farms qualify for more
    if (farmType === 'organic') opportunities += 3; // Organic has many programs
    if (farmType === 'livestock') opportunities += 2; // Modernization grants
    if (farm.status === 'Profile Complete') opportunities += 1;
    
    // Estimate funding potential based on farm size and type
    let fundingPotential = 15000; // Base amount
    if (hectares > 0) fundingPotential += hectares * 500; // €500 per hectare
    if (farmType === 'organic') fundingPotential += 25000; // Organic transition bonus
    if (farmType === 'livestock') fundingPotential += 40000; // Equipment grants
    
    // Determine urgent issues
    let urgentIssues = 0;
    if (farm.status === 'Incomplete') urgentIssues += 1;
    if (!farm.total_hectares) urgentIssues += 1;
    
    // Compliance status based on profile completeness
    const complianceStatus = farm.status === 'Profile Complete' ? 'current' : 'expiring';
    
    // Recent activity
    const lastUpdate = new Date(farm.updated_at || farm.created_at);
    const recentActivity = formatDistanceToNow(lastUpdate, { addSuffix: true });
    
    // Next recommended action
    let nextAction = 'View available funding';
    if (farm.status === 'Incomplete') nextAction = 'Complete farm profile';
    else if (!farm.total_hectares) nextAction = 'Add farm size information';
    else if (opportunities > 3) nextAction = 'Review high-value opportunities';
    
    return {
      farmType,
      primaryOperations: primaryOperations.length > 0 ? primaryOperations : ['General Agriculture'],
      fundingReadinessScore: Math.min(readinessScore, 100),
      availableOpportunities: opportunities,
      estimatedFundingPotential: fundingPotential,
      urgentIssues,
      complianceStatus,
      nextRecommendedAction: nextAction,
      recentActivity
    };
  };

  const intelligence = generateIntelligence(farm);

  const getFarmTypeIcon = (type: string) => {
    switch (type) {
      case 'livestock': return <Beef className="h-4 w-4" />;
      case 'dairy': return <Milk className="h-4 w-4" />;
      case 'crops': return <Wheat className="h-4 w-4" />;
      case 'organic': return <Sprout className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    if (score >= 60) return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
    return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-green-800 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'expiring': return 'text-orange-800 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      case 'expired': return 'text-red-800 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default: return 'text-gray-800 bg-gray-100 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleQuickAction = () => {
    if (intelligence.urgentIssues > 0) {
      navigate(`/farm/${farm.id}/edit`);
    } else if (intelligence.availableOpportunities > 2) {
      navigate(`/farm/${farm.id}#subsidies`);
    } else {
      navigate(`/farm/${farm.id}`);
    }
  };

  const handleViewOpportunities = () => {
    navigate(`/farm/${farm.id}#subsidies`);
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 relative flex flex-col h-full">
      {/* Priority indicator */}
      {intelligence.urgentIssues > 0 && (
        <div className="absolute top-3 right-3">
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {intelligence.urgentIssues} issue{intelligence.urgentIssues > 1 ? 's' : ''}
          </Badge>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold text-foreground truncate">
              {farm.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                {getFarmTypeIcon(intelligence.farmType)}
                <span className="text-sm font-medium capitalize text-muted-foreground">
                  {intelligence.farmType}
                </span>
              </div>
              {farm.total_hectares && (
                <Badge variant="outline" className="text-xs">
                  {farm.total_hectares} ha
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Funding Intelligence */}
        <div className="space-y-3 flex-1">
          {/* Readiness Score */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Funding Readiness</span>
            </div>
            <Badge className={getReadinessColor(intelligence.fundingReadinessScore)}>
              {intelligence.fundingReadinessScore}%
            </Badge>
          </div>

          {/* Funding Potential */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Est. Funding Potential</span>
            </div>
            <span className="text-sm font-bold text-green-600">
              €{intelligence.estimatedFundingPotential.toLocaleString()}
            </span>
          </div>

          {/* Available Opportunities */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Available Programs</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-blue-600">
                {intelligence.availableOpportunities} programs
              </Badge>
              {intelligence.availableOpportunities > 3 && (
                <Badge variant="default" className="text-xs">
                  High Value
                </Badge>
              )}
            </div>
          </div>

          {/* Primary Operations */}
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground font-medium">Primary Operations:</span>
            <div className="flex flex-wrap gap-1">
              {intelligence.primaryOperations.slice(0, 3).map((operation, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {operation}
                </Badge>
              ))}
              {intelligence.primaryOperations.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{intelligence.primaryOperations.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          {/* Compliance Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Compliance</span>
            </div>
            <Badge className={getComplianceColor(intelligence.complianceStatus)} variant="secondary">
              {intelligence.complianceStatus === 'current' ? 'Up to Date' : 
               intelligence.complianceStatus === 'expiring' ? 'Needs Review' : 'Action Required'}
            </Badge>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
            <MapPin className="h-3 w-3" />
            <span>{farm.department || 'Location not specified'}</span>
            <span>•</span>
            <Calendar className="h-3 w-3" />
            <span>Updated {intelligence.recentActivity}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs text-muted-foreground font-medium">
            Recommended: {intelligence.nextRecommendedAction}
          </div>
          <div className="flex gap-2">
            <Button 
              variant={intelligence.urgentIssues > 0 ? "destructive" : "default"}
              size="sm" 
              onClick={handleQuickAction}
              className="flex-1"
            >
              {intelligence.urgentIssues > 0 ? 'Fix Issues' : 'Optimize Funding'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewOpportunities}
              className="flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              {intelligence.availableOpportunities}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmIntelligenceCard;