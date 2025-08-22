import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Target } from 'lucide-react';

interface EligibilityIndicatorProps {
  matchScore: number;
  eligibilityStatus: 'eligible' | 'potentially_eligible' | 'not_eligible';
  matchDetails: {
    clientType: boolean;
    geography: boolean;
    sector: boolean;
    size: boolean;
    financial: boolean;
    deadline: boolean;
  };
  missingRequirements: string[];
  className?: string;
}

const criteriaLabels = {
  clientType: 'Client Type',
  geography: 'Geography',
  sector: 'Sector/Activity',
  size: 'Size Criteria',
  financial: 'Financial Thresholds',
  deadline: 'Deadline Status'
};

const getStatusConfig = (status: EligibilityIndicatorProps['eligibilityStatus']) => {
  switch (status) {
    case 'eligible':
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Eligible',
        description: 'You meet the main requirements for this subsidy'
      };
    case 'potentially_eligible':
      return {
        icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Potentially Eligible',
        description: 'You may be eligible but some criteria need verification'
      };
    case 'not_eligible':
      return {
        icon: <XCircle className="w-5 h-5 text-red-600" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Not Eligible',
        description: 'You do not meet the requirements for this subsidy'
      };
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

export const EligibilityIndicator: React.FC<EligibilityIndicatorProps> = ({
  matchScore,
  eligibilityStatus,
  matchDetails,
  missingRequirements,
  className = ''
}) => {
  const statusConfig = getStatusConfig(eligibilityStatus);
  const metCriteria = Object.values(matchDetails).filter(Boolean).length;
  const totalCriteria = Object.keys(matchDetails).length;

  return (
    <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusConfig.icon}
            <div>
              <CardTitle className={`text-lg ${statusConfig.color}`}>
                {statusConfig.label}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {statusConfig.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(matchScore)}`}>
              {Math.round(matchScore)}%
            </div>
            <Badge variant="outline" className="text-xs">
              Match Score
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Criteria Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Eligibility Criteria</h4>
            <span className="text-sm text-gray-600">
              {metCriteria}/{totalCriteria} met
            </span>
          </div>
          
          <Progress 
            value={(metCriteria / totalCriteria) * 100} 
            className="h-2 mb-3"
          />

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(matchDetails).map(([key, met]) => (
              <div key={key} className="flex items-center gap-2">
                {met ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <span className={`text-sm ${met ? 'text-green-700' : 'text-gray-500'}`}>
                  {criteriaLabels[key as keyof typeof criteriaLabels]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Requirements */}
        {missingRequirements.length > 0 && (
          <div className="bg-white/60 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-sm">To Improve Eligibility:</h4>
            </div>
            <ul className="space-y-1 text-sm text-gray-700">
              {missingRequirements.map((requirement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Success Message */}
        {eligibilityStatus === 'eligible' && (
          <div className="bg-white/60 rounded-lg p-3">
            <p className="text-sm text-green-700 font-medium">
              🎉 Great! You appear to meet the main requirements for this subsidy. 
              Consider starting your application.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};