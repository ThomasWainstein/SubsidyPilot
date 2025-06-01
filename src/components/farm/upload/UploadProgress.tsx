
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Loader2 } from 'lucide-react';

interface UploadProgressProps {
  progress: number;
  uploadedFiles: string[];
  isUploading: boolean;
}

const UploadProgress = ({ progress, uploadedFiles, isUploading }: UploadProgressProps) => {
  if (!isUploading) return null;

  return (
    <div className="space-y-3" role="progressbar" aria-valuenow={progress} aria-valuemax={100}>
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center font-medium">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
          Uploading documents...
        </span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-3" aria-label="Upload progress" />
      {uploadedFiles.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Successfully uploaded: {uploadedFiles.join(', ')}
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
