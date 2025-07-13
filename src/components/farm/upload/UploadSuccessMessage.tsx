import React from 'react';
import { CheckCircle2, FileText } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadSuccessMessageProps {
  uploadedFiles: string[];
  show: boolean;
}

const UploadSuccessMessage = ({ uploadedFiles, show }: UploadSuccessMessageProps) => {
  if (!show || uploadedFiles.length === 0) return null;

  return (
    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800 dark:text-green-200">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">
            {uploadedFiles.length} document{uploadedFiles.length > 1 ? 's' : ''} uploaded successfully
          </span>
        </div>
        <div className="mt-1 text-sm">
          {uploadedFiles.join(', ')}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default UploadSuccessMessage;