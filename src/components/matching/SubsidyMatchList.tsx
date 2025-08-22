import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, Calendar, Euro, Building, MapPin } from 'lucide-react';
import { SubsidyMatch } from '@/hooks/useSubsidyMatching';

interface SubsidyMatchListProps {
  matches: SubsidyMatch[];
  isLoading?: boolean;
  onViewDetails?: (subsidyId: string) => void;
  onStartApplication?: (subsidyId: string) => void;
  className?: string;
}

const getEligibilityIcon = (status: SubsidyMatch['eligibilityStatus']) => {
  switch (status) {
    case 'eligible':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'potentially_eligible':
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    case 'not_eligible':
      return <XCircle className="w-4 h-4 text-red-600" />;
  }
};

const getEligibilityColor = (status: SubsidyMatch['eligibilityStatus']) => {
  switch (status) {
    case 'eligible':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'potentially_eligible':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'not_eligible':
      return 'bg-red-50 border-red-200 text-red-800';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const formatDeadline = (deadline: string | null) => {
  if (!deadline) return 'No deadline specified';
  
  const date = new Date(deadline);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Deadline passed';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `${diffDays} days left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
  
  return date.toLocaleDateString();
};

export const SubsidyMatchList: React.FC<SubsidyMatchListProps> = ({
  matches,
  isLoading = false,
  onViewDetails,
  onStartApplication,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <Alert className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No matching subsidies found. Try adjusting your client profile or search filters.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Found {matches.length} Matching Subsidies</h3>
          <p className="text-sm text-gray-600">
            {matches.filter(m => m.eligibilityStatus === 'eligible').length} eligible, {' '}
            {matches.filter(m => m.eligibilityStatus === 'potentially_eligible').length} potentially eligible
          </p>
        </div>
        <Badge variant="secondary">
          Best match: {Math.round(matches[0]?.matchScore || 0)}%
        </Badge>
      </div>

      {/* Match List */}
      {matches.map((match) => (
        <Card key={match.subsidyId} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getEligibilityIcon(match.eligibilityStatus)}
                  <CardTitle className="text-lg">{match.title}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={getEligibilityColor(match.eligibilityStatus)}
                  >
                    {match.eligibilityStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {match.agency}
                  </span>
                  <span className="flex items-center gap-1">
                    <Euro className="w-3 h-3" />
                    {match.fundingAmount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDeadline(match.deadline)}
                  </span>
                </CardDescription>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(match.matchScore)}`}>
                  {Math.round(match.matchScore)}%
                </div>
                <div className="text-xs text-gray-500">match score</div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Match Details */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Eligibility Criteria</span>
                <span className="text-xs text-gray-500">
                  {Object.values(match.matchDetails).filter(Boolean).length}/6 criteria met
                </span>
              </div>
              <Progress value={(Object.values(match.matchDetails).filter(Boolean).length / 6) * 100} className="h-2" />
              
              <div className="grid grid-cols-3 gap-2 mt-3">
                {Object.entries(match.matchDetails).map(([key, met]) => (
                  <div key={key} className="flex items-center gap-1">
                    {met ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-gray-300" />
                    )}
                    <span className={`text-xs ${met ? 'text-green-700' : 'text-gray-500'}`}>
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Requirements */}
            {match.missingRequirements.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Missing Requirements:</div>
                  <ul className="text-sm space-y-1">
                    {match.missingRequirements.slice(0, 3).map((req, i) => (
                      <li key={i}>• {req}</li>
                    ))}
                    {match.missingRequirements.length > 3 && (
                      <li className="text-gray-500">
                        • +{match.missingRequirements.length - 3} more requirements
                      </li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewDetails?.(match.subsidyId)}
              >
                View Details
              </Button>
              {match.eligibilityStatus === 'eligible' && (
                <Button 
                  size="sm"
                  onClick={() => onStartApplication?.(match.subsidyId)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start Application
                </Button>
              )}
              {match.eligibilityStatus === 'potentially_eligible' && (
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => onStartApplication?.(match.subsidyId)}
                >
                  Check Eligibility
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};