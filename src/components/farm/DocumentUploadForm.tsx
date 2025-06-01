
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from 'lucide-react';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { VALID_DOCUMENT_CATEGORIES, CATEGORY_LABELS, isValidDocumentCategory } from '@/utils/documentValidation';
import FileDropZone from './upload/FileDropZone';
import FilePreviewList from './upload/FilePreviewList';
import UploadProgress from './upload/UploadProgress';

interface DocumentUploadFormProps {
  farmId: string;
  onUploadSuccess?: () => void;
}

const DocumentUploadForm = ({ farmId, onUploadSuccess }: DocumentUploadFormProps) => {
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
  } = useDocumentUpload({ farmId, onSuccess: onUploadSuccess });

  // Validate category before setting it - only allow valid categories or empty string for clearing
  const handleCategoryChange = (value: string) => {
    console.log('Category change requested:', value);
    
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" aria-hidden="true" />
          <span>Upload Documents</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category">Document Category *</Label>
          <Select value={category || ''} onValueChange={handleCategoryChange} disabled={isUploading}>
            <SelectTrigger id="category" aria-label="Select document category">
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
            <p className="text-sm text-red-600">Please select a valid category</p>
          )}
        </div>

        {/* File Drop Zone */}
        <FileDropZone onDrop={addFiles} disabled={isUploading} />

        {/* Selected Files Preview */}
        <FilePreviewList
          files={selectedFiles}
          uploadedFiles={uploadedFiles}
          onRemoveFile={removeFile}
          disabled={isUploading}
        />

        {/* Upload Progress */}
        <UploadProgress
          progress={uploadProgress}
          uploadedFiles={uploadedFiles}
          isUploading={isUploading}
        />

        {/* Upload Button */}
        <Button
          onClick={uploadFiles}
          disabled={selectedFiles.length === 0 || !hasValidCategory || isUploading}
          className="w-full"
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
              Upload {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}` : 'Documents'}
            </>
          )}
        </Button>
        
        {selectedFiles.length > 0 && !hasValidCategory && (
          <p className="text-sm text-amber-600 text-center">
            Please select a document category before uploading
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUploadForm;
