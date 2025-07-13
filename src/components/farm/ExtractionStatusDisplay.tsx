import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface ExtractionStatusDisplayProps {
  status: 'pending' | 'completed' | 'failed' | 'no_extraction';
  confidence?: number | null;
  errorMessage?: string | null;
  className?: string;
}

const ExtractionStatusDisplay = ({ 
  status, 
  confidence, 
  errorMessage, 
  className = ""
}: ExtractionStatusDisplayProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          label: `Extracted (${confidence || 0}%)`,
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Extraction Failed',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3" />,
          label: 'Extracting...',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'no_extraction':
      default:
        return {
          icon: <Sparkles className="h-3 w-3" />,
          label: 'Ready to Extract',
          variant: 'outline' as const,
          className: 'bg-gray-50 text-gray-600 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={`text-xs ${config.className} ${className}`}
      title={errorMessage || undefined}
    >
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </Badge>
  );
};

export default ExtractionStatusDisplay;