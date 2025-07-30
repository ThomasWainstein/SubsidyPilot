/**
 * Enhanced Document Upload Integration for Existing Farms
 * Seamlessly integrates extraction pipeline with existing farm document uploads
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, FileText, Upload, Zap } from 'lucide-react';
import { useFarmProfileUpdate } from '@/hooks/useFarmProfileUpdate';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import DocumentUploadForm from './DocumentUploadForm';
import FullExtractionReview from '@/components/review/FullExtractionReview';
import { toast } from 'sonner';

interface EnhancedDocumentUploadProps {
  farmId: string;
  onProfileUpdated?: () => void;
}

const EnhancedDocumentUpload: React.FC<EnhancedDocumentUploadProps> = ({
  farmId,
  onProfileUpdated
}) => {
  const [showReview, setShowReview] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const {
    processDocumentExtraction,
    applyExtractionToForm,
    pendingExtractions,
    isExtracting,
    isPending,
    getExtractionData,
    clearPendingExtraction,
    reprocessAllDocuments
  } = useFarmProfileUpdate({ 
    farmId, 
    enableAutoExtraction: false, // Manual control for existing farms
    mergeStrategy: 'merge' 
  });

  /**
   * Handles successful document upload and triggers extraction
   */
  const handleUploadSuccess = useCallback(async (
    files: Array<{ documentId: string; fileName: string; fileUrl: string; category: string }>
  ) => {
    for (const file of files) {
      try {
        await processDocumentExtraction(
          file.documentId,
          file.fileName,
          file.fileUrl,
          file.category
        );
      } catch (error) {
        console.error(`Extraction failed for ${file.fileName}:`, error);
      }
    }

    if (onProfileUpdated) {
      onProfileUpdated();
    }
  }, [processDocumentExtraction, onProfileUpdated]);

  /**
   * Handles manual extraction application
   */
  const handleApplyExtraction = useCallback(async (documentId: string) => {
    try {
      await applyExtractionToForm(documentId);
      toast.success('Extraction data applied to farm profile');
      
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (error) {
      toast.error('Failed to apply extraction data');
    }
  }, [applyExtractionToForm, onProfileUpdated]);

  /**
   * Opens extraction review modal
   */
  const handleReviewExtraction = useCallback((documentId: string) => {
    setSelectedDocumentId(documentId);
    setShowReview(true);
  }, []);

  /**
   * Handles bulk reprocessing
   */
  const handleBulkReprocess = useCallback(async () => {
    try {
      await reprocessAllDocuments();
      toast.success('All documents reprocessed successfully');
      
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (error) {
      toast.error('Failed to reprocess documents');
    }
  }, [reprocessAllDocuments, onProfileUpdated]);

  return (
    <div className="space-y-6">
      {/* Document Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentUploadForm
            farmId={farmId}
            onUploadSuccess={handleUploadSuccess}
          />
        </CardContent>
      </Card>

      {/* Pending Extractions */}
      {pendingExtractions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Document Reviews ({pendingExtractions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingExtractions.map((extraction) => (
                <div
                  key={extraction.documentId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{extraction.fileName}</span>
                      <Badge variant={extraction.confidence > 85 ? 'default' : 'secondary'}>
                        {extraction.confidence}% confidence
                      </Badge>
                      {extraction.category && (
                        <Badge variant="outline">{extraction.category}</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>
                          ✅ {Object.keys(extraction.mappedData || {}).length} fields extracted
                        </span>
                        {extraction.unmappedFields.length > 0 && (
                          <span className="text-amber-600">
                            ⚠️ {extraction.unmappedFields.length} unmapped fields
                          </span>
                        )}
                        {extraction.validationErrors.length > 0 && (
                          <span className="text-red-600">
                            ❌ {extraction.validationErrors.length} validation issues
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReviewExtraction(extraction.documentId)}
                    >
                      Review
                    </Button>
                    
                    <Button
                      size="sm"
                      onClick={() => handleApplyExtraction(extraction.documentId)}
                      disabled={isExtracting}
                    >
                      Apply to Profile
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearPendingExtraction(extraction.documentId)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Apply All Button */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    pendingExtractions.forEach(extraction => 
                      clearPendingExtraction(extraction.documentId)
                    );
                  }}
                >
                  Dismiss All
                </Button>
                
                <Button
                  onClick={async () => {
                    for (const extraction of pendingExtractions) {
                      await handleApplyExtraction(extraction.documentId);
                    }
                  }}
                  disabled={isExtracting}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Apply All to Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Bulk Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleBulkReprocess}
              disabled={isExtracting}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Reprocess All Documents
            </Button>
            
            <div className="text-sm text-muted-foreground self-center">
              Re-extract data from all farm documents using the latest extraction pipeline
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extraction Review Modal */}
      {showReview && selectedDocumentId && (
        <FullExtractionReview
          documentId={selectedDocumentId}
          extraction={getExtractionData(selectedDocumentId)}
          farmId={farmId}
          onSave={(data) => {}}
          onApplyToForm={async (data) => {
            await handleApplyExtraction(selectedDocumentId);
            setShowReview(false);
            setSelectedDocumentId(null);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedDocumentUpload;