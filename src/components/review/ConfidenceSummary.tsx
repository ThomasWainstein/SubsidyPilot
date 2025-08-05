import React from 'react';
import { Badge } from '@/components/ui/badge';
import ConfidenceBadge, { getConfidenceLevel } from './ConfidenceBadge';

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

interface ConfidenceSummaryProps {
  fields: FieldData[];
  className?: string;
}

const ConfidenceSummary: React.FC<ConfidenceSummaryProps> = ({ fields, className = '' }) => {
  const totalFields = fields.length;
  
  if (totalFields === 0) {
    return <Badge variant="outline" className={className}>No fields</Badge>;
  }

  const highConfidence = fields.filter(f => getConfidenceLevel(f.confidence) === 'high').length;
  const mediumConfidence = fields.filter(f => getConfidenceLevel(f.confidence) === 'medium').length;
  const lowConfidence = fields.filter(f => getConfidenceLevel(f.confidence) === 'low').length;
  
  const avgConfidence = fields.reduce((sum, field) => sum + field.confidence, 0) / totalFields;
  const avgPercentage = Math.round(avgConfidence * 100);

  const getDominantLevel = () => {
    if (highConfidence > mediumConfidence && highConfidence > lowConfidence) return 'high';
    if (mediumConfidence > lowConfidence) return 'medium';
    return 'low';
  };

  const dominantLevel = getDominantLevel();
  
  const getVariantByLevel = (level: string) => {
    switch (level) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <ConfidenceBadge 
        confidence={avgConfidence} 
        size="sm"
      />
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        {highConfidence > 0 && (
          <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 px-2 py-0">
            {highConfidence}H
          </Badge>
        )}
        {mediumConfidence > 0 && (
          <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-200 px-2 py-0">
            {mediumConfidence}M
          </Badge>
        )}
        {lowConfidence > 0 && (
          <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200 px-2 py-0">
            {lowConfidence}L
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ConfidenceSummary;