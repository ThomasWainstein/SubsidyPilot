
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { FileUp, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DropzoneUploadProps {
  onUploadSuccess: (document: {
    id: string;
    name: string;
    type: string;
    tag: string;
    uploadedAt: string;
  }) => void;
  onFilesSelected?: (files: File[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  title?: string;
  description?: string;
}

export const DropzoneUpload = ({ 
  onUploadSuccess, 
  onFilesSelected,
  maxFiles = 1,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc', '.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png']
  },
  title,
  description
}: DropzoneUploadProps) => {
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const simulateOCRProcess = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);

    // Simulate OCR progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(i);
    }

    // 10% chance of error for demo purposes
    if (Math.random() < 0.1) {
      setIsProcessing(false);
      setUploadProgress(0);
      toast({
        variant: "destructive",
        title: t('messages.scanningDocument'),
        description: "Unable to process document — please check format or reupload.",
      });
      return false;
    }

    // Success case
    await new Promise(resolve => setTimeout(resolve, 500));
    const newDoc = {
      id: `d${Date.now()}`,
      name: file.name,
      type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
      tag: 'Land Certificate',
      uploadedAt: new Date().toISOString().split('T')[0],
    };

    setIsProcessing(false);
    setUploadProgress(0);
    
    toast({
      title: t('messages.documentUploaded'),
      description: `${file.name} processed successfully`,
    });
    
    onUploadSuccess(newDoc);
    return true;
  };

  const processFile = async (file: File) => {
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowedTypes = Object.values(accept).flat();

    if (!allowedTypes.includes(fileExt)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a valid file type.",
      });
      return;
    }

    if (onFilesSelected) {
      onFilesSelected([file]);
    } else {
      await simulateOCRProcess(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-all duration-200",
          isDragging ? "border-primary bg-primary/5" : "border-gray-200 dark:border-gray-700",
          isProcessing ? "pointer-events-none opacity-50" : "hover:border-primary"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <FileUp 
            size={24} 
            className={cn(
              "text-gray-400 dark:text-gray-300",
              isDragging && "text-primary"
            )} 
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragging ? "Drop to Upload Document" : title || "Drag & Drop your document here"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description || "PDF, DOCX, JPG or PNG files"}</p>
          </div>
          
          <div className="mt-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={isProcessing}
            >
              <FileUp size={16} className="mr-2" />
              {t('common.upload')}
            </Button>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept={Object.values(accept).flat().join(',')}
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="animate-fade-in rounded-lg border dark:border-gray-700 p-4 flex items-center gap-4 bg-gray-50 dark:bg-gray-800">
          <div className="relative">
            <FileText size={24} className="text-gray-400 dark:text-gray-300" />
            <div className="absolute inset-0 bg-primary/10 animate-pulse rounded" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium dark:text-white">Processing with OCR...</p>
            <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          {uploadProgress === 100 && (
            <CheckCircle2 size={24} className="text-green-500 animate-scale-in" />
          )}
        </div>
      )}
    </div>
  );
};
