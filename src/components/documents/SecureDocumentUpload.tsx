/**
 * Secure document upload component with validation
 * Phase 4D: Security Hardening & Input Validation
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  X,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useSecurityValidation } from '@/hooks/useSecurityValidation';
import { supabase } from '@/integrations/supabase/client';

interface SecureDocumentUploadProps {
  farmId?: string;
  clientProfileId?: string;
  onUploadComplete?: (documents: any[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  id: string;
  progress: number;
  status: 'validating' | 'uploading' | 'processing' | 'completed' | 'failed';
  securityCheck: 'pending' | 'passed' | 'failed';
  errors: string[];
  documentId?: string;
}

export const SecureDocumentUpload: React.FC<SecureDocumentUploadProps> = ({
  farmId,
  clientProfileId,
  onUploadComplete,
  maxFiles = 10,
  disabled = false,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { validateFile, checkRateLimit, isValidating, violations } = useSecurityValidation();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || isUploading) return;

    // Check rate limiting
    if (!checkRateLimit('document_processing')) {
      return;
    }

    // Check file count limits
    if (acceptedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);

    // Initialize uploading files state
    const initialFiles: UploadingFile[] = acceptedFiles.map((file, index) => ({
      file,
      id: `${Date.now()}-${index}`,
      progress: 0,
      status: 'validating',
      securityCheck: 'pending',
      errors: [],
    }));

    setUploadingFiles(initialFiles);

    // Process each file
    for (const uploadingFile of initialFiles) {
      await processFile(uploadingFile);
    }

    setIsUploading(false);

    // Callback with completed documents
    const completedDocs = uploadingFiles
      .filter(f => f.status === 'completed' && f.documentId)
      .map(f => ({ id: f.documentId, name: f.file.name }));
    
    if (completedDocs.length > 0 && onUploadComplete) {
      onUploadComplete(completedDocs);
    }
  }, [farmId, clientProfileId, checkRateLimit, disabled, isUploading, maxFiles, onUploadComplete, uploadingFiles]);

  const processFile = async (uploadingFile: UploadingFile) => {
    try {
      // Security validation
      updateFileStatus(uploadingFile.id, { status: 'validating', progress: 10 });
      
      const validation = validateFile(uploadingFile.file);
      if (!validation.isValid) {
        updateFileStatus(uploadingFile.id, {
          status: 'failed',
          securityCheck: 'failed',
          errors: validation.errors,
        });
        
        // Log security violation
        await supabase.rpc('log_security_event', {
          p_event_type: 'file_validation_failed',
          p_message: `File validation failed: ${uploadingFile.file.name}`,
          p_event_data: {
            fileName: uploadingFile.file.name,
            fileSize: uploadingFile.file.size,
            fileType: uploadingFile.file.type,
            errors: validation.errors,
          },
          p_risk_level: 'medium',
        });
        
        return;
      }

      updateFileStatus(uploadingFile.id, {
        securityCheck: 'passed',
        progress: 25,
        status: 'uploading',
      });

      // Upload to storage
      const fileName = `${Date.now()}-${uploadingFile.file.name}`;
      const filePath = `documents/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadingFile.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      updateFileStatus(uploadingFile.id, { progress: 50 });

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      updateFileStatus(uploadingFile.id, { progress: 75, status: 'processing' });

      // Create document record - simplified for now
      const documentData = { id: crypto.randomUUID() };
      
      // Log successful upload
      await supabase.rpc('log_security_event', {
        p_event_type: 'document_uploaded',
        p_message: `Document uploaded successfully: ${uploadingFile.file.name}`,
        p_event_data: {
          fileName: uploadingFile.file.name,
          fileSize: uploadingFile.file.size,
          fileType: uploadingFile.file.type,
          publicUrl: publicUrl,
        },
        p_risk_level: 'low',
      });

      toast.success(`${uploadingFile.file.name} uploaded successfully`);

    } catch (error) {
      console.error('File upload error:', error);
      
      updateFileStatus(uploadingFile.id, {
        status: 'failed',
        errors: [error instanceof Error ? error.message : 'Upload failed'],
      });

      // Log upload failure
      await supabase.rpc('log_security_event', {
        p_event_type: 'document_upload_failed',
        p_message: `Document upload failed: ${uploadingFile.file.name}`,
        p_event_data: {
          fileName: uploadingFile.file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        p_risk_level: 'high',
      });

      toast.error(`Failed to upload ${uploadingFile.file.name}`);
    }
  };

  const updateFileStatus = (fileId: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ));
  };

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
    maxFiles,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
  });

  const getStatusIcon = (file: UploadingFile) => {
    switch (file.status) {
      case 'validating':
        return <Shield className="h-4 w-4 text-primary animate-pulse" />;
      case 'uploading':
      case 'processing':
        return <Upload className="h-4 w-4 text-primary animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSecurityBadge = (file: UploadingFile) => {
    switch (file.securityCheck) {
      case 'passed':
        return <Badge variant="outline" className="text-xs text-success">✓ Secure</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">✗ Failed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Checking...</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Security Status */}
      {violations.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Security violations detected: {violations.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
              ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Drag & drop documents or click to browse
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports PDF, DOCX, XLSX, TXT, CSV, and images (max 50MB each)
                </p>
                <Button variant="outline" disabled={disabled || isUploading}>
                  Select Files
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(file)}
                    <span className="font-medium truncate">{file.file.name}</span>
                    {getSecurityBadge(file)}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {Math.round(file.file.size / 1024)} KB
                    </span>
                    {file.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <Progress value={file.progress} className="h-2" />
                
                {file.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {file.errors.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};