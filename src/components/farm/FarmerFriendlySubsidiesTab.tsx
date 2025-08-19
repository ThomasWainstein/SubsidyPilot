import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Euro, 
  Calendar, 
  MapPin, 
  Search, 
  TrendingUp, 
  Target,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';
import { useFarm } from '@/hooks/useFarms';
import { useSubsidyFiltering } from '@/hooks/useSubsidyFiltering';
import { useNavigate } from 'react-router-dom';
import { getSubsidyTitle } from '@/utils/subsidyFormatting';

interface FarmerFriendlySubsidiesTabProps {
  farmId: string;
}

const OpportunityCard = ({ subsidy, farmType }: { subsidy: any; farmType: string }) => {
  const navigate = useNavigate();
  
  const getMatchReason = (subsidy: any, farmType: string) => {
    if (subsidy.matchConfidence > 80) return `Perfect match for ${farmType}`;
    if (subsidy.matchConfidence > 60) return `Good fit for your operations`;
    return `Potential opportunity`;
  };

  const getUrgencyLevel = (deadline: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 7) return { level: 'urgent', text: `${days} days left`, color: 'text-red-600' };
    if (days <= 30) return { level: 'soon', text: `${days} days left`, color: 'text-orange-600' };
    return { level: 'normal', text: `${days} days left`, color: 'text-green-600' };
  };

  const urgency = getUrgencyLevel(subsidy.deadline);

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-2">
              {getSubsidyTitle(subsidy)}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {getMatchReason(subsidy, farmType)}
            </p>
          </div>
          <Badge 
            variant={subsidy.matchConfidence > 70 ? 'default' : 'secondary'}
            className="ml-2 flex items-center gap-1"
          >
            <Star className="h-3 w-3" />
            {subsidy.matchConfidence}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Funding Information */}
        <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Funding Available
            </span>
          </div>
          <div className="text-xl font-bold text-green-600">
            {typeof subsidy.amount === 'number' ? `€${subsidy.amount.toLocaleString()}` : 
             Array.isArray(subsidy.amount) ? `€${Math.max(...subsidy.amount).toLocaleString()}` : 
             'Amount varies'}
          </div>
          <div className="text-xs text-green-700 dark:text-green-300">
            {subsidy.fundingType || 'Grant funding'}
          </div>
        </div>

        {/* Deadline Information */}
        {subsidy.deadline && urgency && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Application Deadline</span>
            </div>
            <div className={`text-sm font-semibold ${urgency.color}`}>
              {urgency.text}
            </div>
          </div>
        )}

        {/* Program Details */}
        <div className="space-y-2">
          {subsidy.sector && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Focus: {subsidy.sector}</span>
            </div>
          )}
          {subsidy.region && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Region: {subsidy.region}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button 
            className="flex-1"
            onClick={() => navigate(`/subsidy/${subsidy.id}`)}
          >
            Check Eligibility
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate(`/subsidy/${subsidy.id}#requirements`)}
          >
            Requirements
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const FarmerFriendlySubsidiesTab: React.FC<FarmerFriendlySubsidiesTabProps> = ({ farmId }) => {
  const navigate = useNavigate();
  const { data: farm } = useFarm(farmId);
  
  // Get matched subsidies with higher confidence threshold
  const { 
    subsidies: matchingSubsidies, 
    loading, 
    error, 
    totalCount 
  } = useSubsidyFiltering(farmId, {
    confidenceFilter: [40], // Show subsidies with >40% match
    regions: [],
    eligibleCountry: '',
    farmingTypes: [],
    fundingSources: [],
    fundingInstruments: [],
    documentsRequired: [],
    applicationFormats: [],
    sustainabilityGoals: [],
    deadlineStatuses: ['open'],
  }, '');

  const getFarmType = () => {
    if (!farm) return 'farm';
    const landUseTypes = farm.land_use_types || [];
    const hasLivestock = farm.livestock_present;
    
    if (landUseTypes.includes('organic')) return 'organic farm';
    if (hasLivestock) return 'livestock farm';
    if (landUseTypes.includes('arable_crops')) return 'crop farm';
    if (landUseTypes.includes('dairy')) return 'dairy farm';
    return 'farm';
  };

  const calculateTotalFunding = () => {
    if (!matchingSubsidies) return 0;
    
    return matchingSubsidies.reduce((total, s) => {
      if (!s.amount) return total;
      
      // Handle both number and array types
      if (typeof s.amount === 'number') {
        return total + s.amount;
      } else if (Array.isArray(s.amount) && s.amount.length > 0) {
        // If it's an array, take the first value or max value
        const maxAmount = Math.max(...s.amount.filter(a => typeof a === 'number'));
        return total + (isFinite(maxAmount) ? maxAmount : 0);
      }
      
      return total;
    }, 0);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Finding funding opportunities for your farm...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-600">Unable to Load Opportunities</h3>
              <p className="text-sm text-muted-foreground">
                We're having trouble finding funding programs right now. Please try again later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const highValueOpportunities = matchingSubsidies?.filter(s => s.matchConfidence > 70) || [];
  const goodOpportunities = matchingSubsidies?.filter(s => s.matchConfidence >= 50 && s.matchConfidence <= 70) || [];
  const potentialOpportunities = matchingSubsidies?.filter(s => s.matchConfidence < 50) || [];
  const totalFunding = calculateTotalFunding();

  return (
    <div className="space-y-6">
      {/* Funding Overview */}
      {matchingSubsidies && matchingSubsidies.length > 0 && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Your Funding Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {matchingSubsidies.length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Programs Match</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {highValueOpportunities.length}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">High Priority</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 flex items-center justify-center">
                  <Euro className="h-5 w-5 mr-1" />
                  {totalFunding > 0 ? `${Math.round(totalFunding / 1000)}K+` : '—'}
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">Total Available</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* High Priority Opportunities */}
      {highValueOpportunities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              High Priority Opportunities
            </h3>
            <Badge variant="default">{highValueOpportunities.length} programs</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {highValueOpportunities.map((subsidy) => (
              <OpportunityCard key={subsidy.id} subsidy={subsidy} farmType={getFarmType()} />
            ))}
          </div>
        </div>
      )}

      {/* Good Opportunities */}
      {goodOpportunities.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Good Opportunities
            </h3>
            <Badge variant="secondary">{goodOpportunities.length} programs</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {goodOpportunities.slice(0, 4).map((subsidy) => (
              <OpportunityCard key={subsidy.id} subsidy={subsidy} farmType={getFarmType()} />
            ))}
          </div>
          {goodOpportunities.length > 4 && (
            <div className="text-center">
              <Button variant="outline" onClick={() => navigate(`/search?farm=${farmId}`)}>
                View {goodOpportunities.length - 4} More Opportunities
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty State - Contextual based on farm type */}
      {(!matchingSubsidies || matchingSubsidies.length === 0) && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Looking for Programs for Your {getFarmType()}
            </h3>
            <p className="text-muted-foreground mb-6">
              {farm?.total_hectares 
                ? `Based on your ${farm.total_hectares}-hectare ${getFarmType()}, we're searching for relevant funding opportunities.`
                : `Complete your farm profile to help us find the best funding opportunities for your ${getFarmType()}.`
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate('/search')}>
                Browse All Programs
              </Button>
              {!farm?.total_hectares && (
                <Button variant="outline" onClick={() => navigate(`/farm/${farmId}/edit`)}>
                  Complete Farm Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Need More Options?</h4>
              <p className="text-sm text-muted-foreground">
                Search all available programs with advanced filters
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/search')}>
              <Search className="h-4 w-4 mr-2" />
              Advanced Search
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};