import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  CheckCircle, 
  Edit3, 
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Target
} from 'lucide-react';

interface FieldData {
  key: string;
  label: string;
  value: any;
  confidence: number;
  type: string;
  category: string;
  accepted?: boolean;
  modified?: boolean;
}

interface ReviewSummaryProps {
  fields: FieldData[];
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  percentage?: number;
  color?: 'green' | 'blue' | 'orange' | 'red' | 'gray';
  icon: React.ReactNode;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  percentage, 
  color = 'gray', 
  icon, 
  description 
}) => {
  const colorClasses = {
    green: 'text-green-700 bg-green-100 border-green-200',
    blue: 'text-blue-700 bg-blue-100 border-blue-200',
    orange: 'text-orange-700 bg-orange-100 border-orange-200',
    red: 'text-red-700 bg-red-100 border-red-200',
    gray: 'text-gray-700 bg-gray-100 border-gray-200'
  };

  return (
    <Card className={`${colorClasses[color]} border-2`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          {percentage !== undefined && (
            <Badge variant="outline" className="text-xs">
              {percentage}%
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold">{value}</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {percentage !== undefined && (
          <Progress value={percentage} className="mt-2 h-2" />
        )}
      </CardContent>
    </Card>
  );
};

const ReviewSummary: React.FC<ReviewSummaryProps> = ({ fields, className = '' }) => {
  const totalFields = fields.length;
  
  if (totalFields === 0) {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardContent className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">No fields to review</p>
        </CardContent>
      </Card>
    );
  }

  const acceptedCount = fields.filter(f => f.accepted).length;
  const rejectedCount = fields.filter(f => f.accepted === false).length;
  const modifiedCount = fields.filter(f => f.modified).length;
  const pendingCount = totalFields - acceptedCount - rejectedCount;

  // Confidence analysis
  const highConfidenceCount = fields.filter(f => f.confidence >= 0.8).length;
  const mediumConfidenceCount = fields.filter(f => f.confidence >= 0.5 && f.confidence < 0.8).length;
  const lowConfidenceCount = fields.filter(f => f.confidence < 0.5).length;
  
  const avgConfidence = fields.reduce((sum, field) => sum + field.confidence, 0) / totalFields;
  const avgConfidencePercentage = Math.round(avgConfidence * 100);

  // Acceptance rate by confidence level
  const highConfidenceAccepted = fields.filter(f => f.confidence >= 0.8 && f.accepted).length;
  const mediumConfidenceAccepted = fields.filter(f => f.confidence >= 0.5 && f.confidence < 0.8 && f.accepted).length;
  const lowConfidenceAccepted = fields.filter(f => f.confidence < 0.5 && f.accepted).length;

  const highAcceptanceRate = highConfidenceCount > 0 ? Math.round((highConfidenceAccepted / highConfidenceCount) * 100) : 0;
  const mediumAcceptanceRate = mediumConfidenceCount > 0 ? Math.round((mediumConfidenceAccepted / mediumConfidenceCount) * 100) : 0;
  const lowAcceptanceRate = lowConfidenceCount > 0 ? Math.round((lowConfidenceAccepted / lowConfidenceCount) * 100) : 0;

  const overallProgress = Math.round(((acceptedCount + rejectedCount) / totalFields) * 100);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Fields"
          value={totalFields}
          icon={<FileText className="w-5 h-5" />}
          color="gray"
          description="All extracted fields"
        />
        
        <StatCard
          title="Accepted"
          value={acceptedCount}
          percentage={Math.round((acceptedCount / totalFields) * 100)}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          description="Fields approved for use"
        />
        
        <StatCard
          title="Modified"
          value={modifiedCount}
          percentage={Math.round((modifiedCount / totalFields) * 100)}
          icon={<Edit3 className="w-5 h-5" />}
          color="blue"
          description="Fields edited by user"
        />
        
        <StatCard
          title="Avg Confidence"
          value={`${avgConfidencePercentage}%`}
          icon={<Target className="w-5 h-5" />}
          color={avgConfidence >= 0.8 ? 'green' : avgConfidence >= 0.5 ? 'orange' : 'red'}
          description="Overall extraction quality"
        />
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Review Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{overallProgress}% complete</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
                <div className="text-muted-foreground">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                <div className="text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{pendingCount}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Confidence Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Confidence Distribution */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">High</span>
                </div>
                <div className="text-xl font-bold text-green-700">{highConfidenceCount}</div>
                <div className="text-xs text-green-600">≥80% confidence</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Minus className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Medium</span>
                </div>
                <div className="text-xl font-bold text-orange-700">{mediumConfidenceCount}</div>
                <div className="text-xs text-orange-600">50-79% confidence</div>
              </div>
              
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Low</span>
                </div>
                <div className="text-xl font-bold text-red-700">{lowConfidenceCount}</div>
                <div className="text-xs text-red-600">&lt;50% confidence</div>
              </div>
            </div>

            {/* Acceptance Rates by Confidence */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Acceptance Rate by Confidence Level</h4>
              
              <div className="space-y-2">
                {highConfidenceCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700">High Confidence</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={highAcceptanceRate} className="w-20 h-2" />
                      <span className="text-green-700 font-medium w-12">{highAcceptanceRate}%</span>
                    </div>
                  </div>
                )}
                
                {mediumConfidenceCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-orange-700">Medium Confidence</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={mediumAcceptanceRate} className="w-20 h-2" />
                      <span className="text-orange-700 font-medium w-12">{mediumAcceptanceRate}%</span>
                    </div>
                  </div>
                )}
                
                {lowConfidenceCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-700">Low Confidence</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={lowAcceptanceRate} className="w-20 h-2" />
                      <span className="text-red-700 font-medium w-12">{lowAcceptanceRate}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewSummary;