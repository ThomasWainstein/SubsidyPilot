import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface UploadStatsProps {
  stats: {
    totalDocuments: number;
    uploading: number;
    processing: number;
    completed: number;
    failed: number;
    readyForReview: number;
  };
  className?: string;
}

const UploadStats: React.FC<UploadStatsProps> = ({ stats, className }) => {
  const progressPercentage = stats.totalDocuments > 0 
    ? Math.round((stats.completed / stats.totalDocuments) * 100)
    : 0;

  const hasActivity = stats.uploading > 0 || stats.processing > 0;
  const hasErrors = stats.failed > 0;
  const isComplete = stats.totalDocuments > 0 && stats.completed === stats.totalDocuments;

  if (stats.totalDocuments === 0) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {hasActivity ? (
            <Upload className="h-4 w-4 text-blue-600 animate-pulse" />
          ) : isComplete ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : hasErrors ? (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          ) : (
            <Clock className="h-4 w-4 text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-700">
            Document Processing Status
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {isComplete && (
            <Badge variant="default" className="bg-green-600">
              All Complete
            </Badge>
          )}
          {hasActivity && (
            <Badge variant="secondary" className="animate-pulse">
              Processing...
            </Badge>
          )}
          {hasErrors && (
            <Badge variant="destructive">
              {stats.failed} Error{stats.failed !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Overall Progress</span>
          <span>{progressPercentage}% complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Detailed stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600">
            {stats.uploading} Uploading
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          <span className="text-gray-600">
            {stats.processing} Processing
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">
            {stats.completed} Completed
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">
            {stats.failed} Failed
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <FileCheck className="w-3 h-3 text-blue-600" />
          <span className="text-gray-600">
            {stats.readyForReview} Ready
          </span>
        </div>
      </div>

      {/* Action hints */}
      {stats.readyForReview > 0 && (
        <div className="mt-3 p-2 bg-blue-100 border border-blue-200 rounded text-xs text-blue-700">
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>
              {stats.readyForReview} document{stats.readyForReview !== 1 ? 's' : ''} ready for review and prefill
            </span>
          </div>
        </div>
      )}

      {hasErrors && (
        <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3" />
            <span>
              Some documents failed processing. Use the retry button to try again.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadStats;