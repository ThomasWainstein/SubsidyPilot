
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from 'lucide-react';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { VALID_DOCUMENT_CATEGORIES, CATEGORY_LABELS, isValidDocumentCategory } from '@/utils/documentValidation';
import { handleUploadError, showSuccessMessage } from '@/utils/errorHandling';
import FileDropZone from './upload/FileDropZone';
import FilePreviewList from './upload/FilePreviewList';
import UploadProgress from './upload/UploadProgress';
import PageErrorBoundary from '@/components/error/PageErrorBoundary';
import { logger } from '@/lib/logger';

interface DocumentUploadFormProps {
  farmId: string;
  onUploadSuccess?: (files: Array<{ documentId: string; fileName: string; fileUrl: string; category: string }>) => void;
  onExtractionCompleted?: (fileName: string, extraction: any) => void;
}

const DocumentUploadForm = ({ farmId, onUploadSuccess, onExtractionCompleted }: DocumentUploadFormProps) => {
  const {
    selectedFiles,
    category,
    setCategory,
    uploadProgress,
    uploadedFiles,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles,
  } = useDocumentUpload({ 
    farmId, 
    onSuccess: onUploadSuccess
  });

  // Validate category before setting it - only allow valid categories or empty string for clearing
  const handleCategoryChange = (value: string) => {
    logger.debug('Category change requested', { value });
    
    // Allow empty string for clearing selection
    if (value === '') {
      setCategory('');
      return;
    }
    
    // Only allow valid categories
    if (isValidDocumentCategory(value)) {
      setCategory(value);
    } else {
      console.warn('Invalid category selection attempted:', value);
      // Don't change the selection if invalid
    }
  };

  // Check if we have a valid category selected
  const hasValidCategory = category && category.trim() !== '' && isValidDocumentCategory(category);

  const handleFilesAdd = (files: File[]) => {
    try {
      addFiles(files);
    } catch (error) {
      handleUploadError(error);
    }
  };

  const handleUpload = async () => {
    try {
      await uploadFiles();
    } catch (error) {
      handleUploadError(error);
    }
  };

  return (
    <PageErrorBoundary pageName="Document Upload">
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-lg md:text-xl">
            <Upload className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" aria-hidden="true" />
            <span>Upload Documents</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Category Selection - Mobile responsive */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm md:text-base font-medium">
              Document Category *
            </Label>
            <Select value={category || ''} onValueChange={handleCategoryChange} disabled={isUploading}>
              <SelectTrigger id="category" aria-label="Select document category" className="w-full min-h-[44px]">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {VALID_DOCUMENT_CATEGORIES.map((categoryValue) => (
                  <SelectItem key={categoryValue} value={categoryValue}>
                    {CATEGORY_LABELS[categoryValue]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasValidCategory && category !== '' && (
              <p className="text-xs md:text-sm text-red-600">Please select a valid category</p>
            )}
          </div>

          {/* File Drop Zone - Mobile responsive */}
          <div className="w-full">
            <FileDropZone onDrop={handleFilesAdd} disabled={isUploading} />
          </div>

          {/* Selected Files Preview - Mobile responsive */}
          <div className="w-full">
            <FilePreviewList
              files={selectedFiles}
              uploadedFiles={uploadedFiles}
              onRemoveFile={removeFile}
              disabled={isUploading}
            />
          </div>

          {/* Upload Progress - Mobile responsive */}
          <div className="w-full">
            <UploadProgress
              progress={uploadProgress}
              uploadedFiles={uploadedFiles}
              isUploading={isUploading}
              totalFiles={selectedFiles.length}
            />
          </div>

          {/* Upload Button - Mobile responsive */}
          <div className="space-y-3">
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || !hasValidCategory || isUploading}
              className="w-full min-h-[44px]"
              size="lg"
              aria-label={`Upload ${selectedFiles.length} document${selectedFiles.length !== 1 ? 's' : ''}`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}` : 'Documents'}
                  </span>
                  <span className="sm:hidden">
                    Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : 'Files'}
                  </span>
                </>
              )}
            </Button>
            
            {selectedFiles.length > 0 && !hasValidCategory && (
              <p className="text-xs md:text-sm text-amber-600 text-center">
                Please select a document category before uploading
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageErrorBoundary>
  );
};

export default DocumentUploadForm;
