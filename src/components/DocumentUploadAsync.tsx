import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { useAsyncDocumentProcessing } from '@/hooks/useAsyncDocumentProcessing';
import { AsyncProcessingStatus } from './AsyncProcessingStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentUploadAsyncProps {
  farmId: string;
  onUploadComplete?: (documentData: any) => void;
  className?: string;
}

export const DocumentUploadAsync = ({ 
  farmId, 
  onUploadComplete,
  className = ""
}: DocumentUploadAsyncProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);

  const {
    startAsyncProcessing,
    isProcessing,
    processingJob,
    error: processingError
  } = useAsyncDocumentProcessing({
    onComplete: (data) => {
      toast.success('Document processed successfully!');
      onUploadComplete?.(data);
    },
    onError: (error) => {
      toast.error(`Processing failed: ${error}`);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Auto-detect document type from filename
      const fileName = file.name.toLowerCase();
      if (fileName.includes('eu') || fileName.includes('policy')) {
        setDocumentType('eu-policy');
      } else if (fileName.includes('application')) {
        setDocumentType('farm-application');
      } else if (fileName.includes('financial') || fileName.includes('invoice')) {
        setDocumentType('financial');
      } else {
        setDocumentType('general');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      toast.error('Please select a file and document type');
      return;
    }

    setIsUploading(true);
    
    try {
      // Step 1: Get upload URL and create document record
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
        'document-upload-handler',
        {
          body: {
            farmId,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            documentType,
            category: documentType,
            clientType: 'farm'
          }
        }
      );

      if (uploadError || !uploadData?.success) {
        throw new Error(uploadError?.message || uploadData?.error || 'Failed to prepare upload');
      }

      console.log('📤 Upload prepared:', uploadData);
      
      // Step 2: Upload file to signed URL
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      toast.success('File uploaded successfully! Processing started...');
      setUploadedDocumentId(uploadData.documentId);

      // Step 3: Start async processing monitoring
      await startAsyncProcessing(
        uploadData.documentId,
        uploadData.filePath,
        selectedFile.name,
        'farm',
        documentType
      );

    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const getDocumentTypeDescription = (type: string) => {
    switch (type) {
      case 'eu-policy':
        return 'EU Agricultural Policy documents (50MB limit, 3-5 min processing)';
      case 'farm-application':
        return 'Farm subsidy applications (25MB limit, 2-3 min processing)';
      case 'financial':
        return 'Financial documents, invoices, receipts (20MB limit, 1-2 min processing)';
      case 'general':
        return 'General farm documents (15MB limit, 1-2 min processing)';
      default:
        return 'Select document type for optimized processing';
    }
  };

  if (uploadedDocumentId) {
    return (
      <div className={`space-y-4 ${className}`}>
        <AsyncProcessingStatus
          documentId={uploadedDocumentId}
          onComplete={(data) => {
            console.log('✅ Processing completed:', data);
            onUploadComplete?.(data);
          }}
          onError={(error) => {
            console.error('❌ Processing failed:', error);
          }}
        />
        
        {processingJob?.status === 'completed' && (
          <Button 
            onClick={() => {
              setUploadedDocumentId(null);
              setSelectedFile(null);
              setDocumentType('');
            }}
            className="w-full"
          >
            Upload Another Document
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Upload Document (Phase 2 Async Processing)</h3>
          <p className="text-sm text-muted-foreground">
            Advanced async processing handles large EU policy documents without stack overflow errors.
          </p>
        </div>

        {/* File selection */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Select Document</Label>
          <div className="flex items-center space-x-4">
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              className="flex-1"
            />
            {selectedFile && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{Math.round(selectedFile.size / 1024)}KB</span>
              </div>
            )}
          </div>
        </div>

        {/* Document type selection */}
        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type for optimized processing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eu-policy">🇪🇺 EU Agricultural Policy</SelectItem>
              <SelectItem value="farm-application">📋 Farm Application</SelectItem>
              <SelectItem value="financial">💰 Financial Document</SelectItem>
              <SelectItem value="general">📄 General Document</SelectItem>
            </SelectContent>
          </Select>
          {documentType && (
            <p className="text-xs text-muted-foreground">
              {getDocumentTypeDescription(documentType)}
            </p>
          )}
        </div>

        {/* Phase 2 benefits */}
        <div className="bg-accent/30 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-primary">Phase 2 Async Processing Benefits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• ✅ Handles large EU policy documents (up to 50MB)</li>
                <li>• ✅ Eliminates "Maximum call stack size exceeded" errors</li>
                <li>• ✅ Background processing with real-time progress</li>
                <li>• ✅ Service account authentication for security</li>
                <li>• ✅ Automatic retry with exponential backoff</li>
                <li>• ✅ Memory-efficient chunked processing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upload button */}
        <Button 
          onClick={handleUpload}
          disabled={!selectedFile || !documentType || isUploading || isProcessing}
          className="w-full"
          size="lg"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Preparing Upload...' : 
           isProcessing ? 'Processing...' : 
           'Upload & Process Document'}
        </Button>

        {/* Processing status */}
        {processingError && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Processing Error</p>
                <p className="text-sm text-destructive/80 mt-1">{processingError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};