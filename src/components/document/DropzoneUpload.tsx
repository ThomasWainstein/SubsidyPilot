
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { X, Upload, File, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { useLanguage } from '@/contexts/language';
import { toast } from '@/components/ui/use-toast';

export interface DropzoneUploadProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  onUploadSuccess?: (files?: File[]) => void;
  disabled?: boolean;
}

export const DropzoneUpload = ({ 
  title, 
  description, 
  accept = { 
    'application/pdf': ['.pdf'], 
    'application/msword': ['.doc', '.docx'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  },
  maxFiles = 5,
  onUploadSuccess,
  disabled = false
}: DropzoneUploadProps) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Check if we already have maxFiles
    if (files.length + acceptedFiles.length > maxFiles) {
      toast({
        title: t('common.error'),
        description: `You can upload a maximum of ${maxFiles} files.`,
        variant: "destructive",
      });
      return;
    }
    
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, [files, maxFiles, t]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - files.length,
    disabled: disabled || uploading,
  });
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
    
    // Simulate network request
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        
        toast({
          title: t('messages.documentUploaded'),
          description: files.map(f => f.name).join(', ') + ' ' + t('messages.documentUploadedDesc'),
        });
        
        if (onUploadSuccess) {
          onUploadSuccess(files);
        }
        
        setFiles([]);
        setUploadProgress(0);
      }, 500);
    }, 3000);
  };
  
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600'
        } ${(disabled || uploading) ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-10 w-10 text-gray-400" />
          <div className="space-y-1">
            <p className="text-base font-medium">{title || 'Upload Documents'}</p>
            <p className="text-sm text-gray-500">
              {description || 'Drag & drop files here, or click to select files'}
            </p>
          </div>
          <Button type="button" size="sm" className="mt-2" disabled={disabled || uploading}>
            {t('common.upload')}
          </Button>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <File className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button 
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-500"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          
          {uploading ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress < 100 ? t('messages.uploading') : t('messages.complete')}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          ) : (
            <Button 
              onClick={uploadFiles} 
              className="w-full"
              disabled={disabled}
            >
              {t('common.uploadNow')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
