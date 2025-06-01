
import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface FileDropZoneProps {
  onDrop: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

const FileDropZone = ({ onDrop, disabled = false, maxFiles = 5 }: FileDropZoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles,
    maxSize: 50 * 1024 * 1024,
    onDrop,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
          : 'border-gray-300 hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Upload documents by dragging and dropping or clicking to browse"
    >
      <input {...getInputProps()} aria-label="Document upload input" />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
          <Upload className="h-8 w-8 text-gray-400" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragActive ? 'Drop files here' : 'Upload your documents'}
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Supports PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 50MB each)
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileDropZone;
