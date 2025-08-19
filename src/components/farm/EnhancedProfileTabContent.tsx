import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Users, 
  Zap, 
  Calendar,
  Truck,
  Wheat,
  Award,
  TrendingUp,
  Target,
  Euro
} from 'lucide-react';
import { useFarm } from '@/hooks/useFarms';
import { useNavigate } from 'react-router-dom';

interface EnhancedProfileTabContentProps {
  farmId: string;
}

export const EnhancedProfileTabContent: React.FC<EnhancedProfileTabContentProps> = ({ farmId }) => {
  const { data: farm, isLoading } = useFarm(farmId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!farm) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Farm not found</p>
        </CardContent>
      </Card>
    );
  }

  // Generate farm intelligence from real data
  const getFarmType = () => {
    const landUseTypes = farm.land_use_types || [];
    const hasLivestock = farm.livestock_present;
    
    if (landUseTypes.includes('organic')) return 'Organic Farm';
    if (hasLivestock) return 'Livestock Farm';
    if (landUseTypes.includes('arable_crops')) return 'Crop Farm';
    if (landUseTypes.includes('dairy')) return 'Dairy Farm';
    if (landUseTypes.length > 1) return 'Mixed Farm';
    return 'Agricultural Farm';
  };

  const getFarmTypeIcon = () => {
    const farmType = getFarmType();
    if (farmType.includes('Livestock')) return <Truck className="h-5 w-5" />;
    if (farmType.includes('Crop')) return <Wheat className="h-5 w-5" />;
    return <Target className="h-5 w-5" />;
  };

  const getOperationsData = () => {
    const operations = [];
    const landTypes = farm.land_use_types || [];
    
    if (farm.livestock_present) operations.push('Livestock Management');
    if (landTypes.includes('arable_crops')) operations.push('Crop Production');
    if (landTypes.includes('organic')) operations.push('Organic Certification');
    if (landTypes.includes('dairy')) operations.push('Dairy Production');
    if (farm.irrigation_method && farm.irrigation_method !== 'Not specified') {
      operations.push(`${farm.irrigation_method} Irrigation`);
    }
    
    return operations.length > 0 ? operations : ['General Agriculture'];
  };

  const getFundingReadiness = () => {
    let score = 40; // Base score
    if (farm.total_hectares && farm.total_hectares > 0) score += 20;
    if (farm.legal_status) score += 10;
    if (farm.certifications && farm.certifications.length > 0) score += 15;
    if (farm.land_use_types && farm.land_use_types.length > 0) score += 10;
    if (farm.address) score += 5;
    
    return Math.min(score, 100);
  };

  const getEstimatedFunding = () => {
    let potential = 15000; // Base amount
    if (farm.total_hectares && farm.total_hectares > 0) {
      potential += farm.total_hectares * 500; // €500 per hectare
    }
    if (farm.land_use_types?.includes('organic')) potential += 25000;
    if (farm.livestock_present) potential += 30000;
    return potential;
  };

  const readinessScore = getFundingReadiness();
  const estimatedFunding = getEstimatedFunding();
  const operations = getOperationsData();

  return (
    <div className="space-y-6">
      {/* Farm Intelligence Overview */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getFarmTypeIcon()}
            {getFarmType()} Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {readinessScore}%
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Funding Readiness</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 flex items-center justify-center">
                <Euro className="h-5 w-5 mr-1" />
                {Math.round(estimatedFunding / 1000)}K
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Est. Funding Potential</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {operations.length}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Active Operations</div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={() => navigate(`/farm/${farmId}#subsidies`)}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              View Funding Opportunities
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Farm Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin size={20} />
            Farm Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Farm Name</label>
              <p className="text-foreground font-medium">{farm.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Location</label>
              <p className="text-foreground">{farm.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Farm Size</label>
              <p className="text-foreground font-medium">
                {farm.total_hectares ? `${farm.total_hectares} hectares` : 'Size not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Legal Status</label>
              <p className="text-foreground">{farm.legal_status || 'Not specified'}</p>
            </div>
          </div>

          {farm.land_use_types && farm.land_use_types.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Primary Operations</label>
              <div className="flex flex-wrap gap-2">
                {operations.map((operation, index) => (
                  <Badge key={index} variant="secondary" className="capitalize">
                    {operation}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {farm.certifications && farm.certifications.length > 0 && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Certifications</label>
              <div className="flex flex-wrap gap-2">
                {farm.certifications.map((cert, index) => (
                  <Badge key={index} variant="outline" className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operations Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Operations Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold text-primary">
              {farm.staff_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">Staff Members</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold text-primary">
              {farm.livestock_present ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-muted-foreground">Livestock Present</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold text-primary">
              {farm.irrigation_method !== 'Not specified' ? farm.irrigation_method : 'None'}
            </div>
            <div className="text-sm text-muted-foreground">Irrigation</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-xl font-bold text-primary">
              {farm.environmental_permit ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-muted-foreground">Environmental Permit</div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Recommendations */}
      {readinessScore < 80 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Zap size={20} />
              Improve Your Funding Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Complete your farm profile to unlock more funding opportunities:
            </p>
            <ul className="space-y-2 text-sm">
              {!farm.total_hectares && (
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Add your farm size to access size-based grants
                </li>
              )}
              {!farm.legal_status && (
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Specify legal status for compliance requirements
                </li>
              )}
              {(!farm.certifications || farm.certifications.length === 0) && (
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Add certifications to access premium programs
                </li>
              )}
            </ul>
            <Button variant="outline" onClick={() => navigate(`/farm/${farmId}/edit`)}>
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};