import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';

interface UploadRetryButtonProps {
  onRetry: () => void;
  disabled?: boolean;
  failedFiles?: string[];
}

const UploadRetryButton = ({ onRetry, disabled = false, failedFiles = [] }: UploadRetryButtonProps) => {
  if (failedFiles.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm text-amber-600 dark:text-amber-400">
        {failedFiles.length} file{failedFiles.length > 1 ? 's' : ''} failed to upload
      </div>
      <Button
        onClick={onRetry}
        disabled={disabled}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry Upload
      </Button>
    </div>
  );
};

export default UploadRetryButton;