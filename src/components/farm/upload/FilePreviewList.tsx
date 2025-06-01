
import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { File, X, CheckCircle2 } from 'lucide-react';
import { formatFileSize } from '@/utils/fileValidation';

interface FilePreviewListProps {
  files: File[];
  uploadedFiles: string[];
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
}

const FilePreviewList = ({ files, uploadedFiles, onRemoveFile, disabled = false }: FilePreviewListProps) => {
  if (files.length === 0) return null;

  return (
    <div className="space-y-3">
      <Label>Selected Files ({files.length})</Label>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {files.map((file, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <File className="h-5 w-5 text-gray-500" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              {uploadedFiles.includes(file.name) && (
                <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Upload complete" />
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveFile(index)}
              disabled={disabled}
              className="text-gray-500 hover:text-red-500"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilePreviewList;
