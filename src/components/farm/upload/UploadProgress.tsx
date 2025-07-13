
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
  uploadedFiles: string[];
  isUploading: boolean;
  totalFiles?: number;
}

const UploadProgress = ({ progress, uploadedFiles, isUploading, totalFiles = 1 }: UploadProgressProps) => {
  if (!isUploading && uploadedFiles.length === 0) return null;

  const isComplete = !isUploading && uploadedFiles.length > 0;

  return (
    <div className="space-y-3" role="progressbar" aria-valuenow={progress} aria-valuemax={100}>
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center font-medium">
          {isComplete ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" aria-hidden="true" />
              Upload complete
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              Uploading documents... ({uploadedFiles.length}/{totalFiles})
            </>
          )}
        </span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      
      <Progress 
        value={progress} 
        className={`h-3 transition-colors ${isComplete ? 'bg-green-100 dark:bg-green-950/20' : ''}`}
        aria-label="Upload progress" 
      />
      
      {uploadedFiles.length > 0 && (
        <div className={`text-sm p-3 rounded-lg ${isComplete ? 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Upload className="h-4 w-4" />
            <span className="font-medium">
              {isComplete ? 'Successfully uploaded:' : 'Completed so far:'}
            </span>
          </div>
          <div className="text-xs">
            {uploadedFiles.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
