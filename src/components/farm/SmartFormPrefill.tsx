import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, FileText, AlertTriangle, Bug, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useFarmDocumentExtractions } from '@/hooks/useDocumentExtractions';
import FullExtractionReview from '@/components/review/FullExtractionReview';
import ExtractionDebugModal from './ExtractionDebugModal';
import { mapExtractionToForm, validateMappedData, getFieldDisplayName, type MappingResult } from '@/lib/extraction/dataMapper';

interface SmartFormPrefillProps {
  farmId: string;
  onApplyExtraction: (extractedData: any) => void;
  disabled?: boolean;
  currentFormData?: any; // For bidirectional sync
  onFormDataChange?: (data: any) => void; // For bidirectional sync
}

const SmartFormPrefill: React.FC<SmartFormPrefillProps> = ({
  farmId,
  onApplyExtraction,
  disabled = false,
  currentFormData,
  onFormDataChange
}) => {
  const { data: extractions, isLoading } = useFarmDocumentExtractions(farmId);
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [fullReviewOpen, setFullReviewOpen] = useState(false);
  const [selectedExtraction, setSelectedExtraction] = useState<any>(null);
  const [mappingResults, setMappingResults] = useState<Map<string, MappingResult>>(new Map());

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            Checking for AI-extracted data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!extractions || extractions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No AI-extracted data available yet.</p>
            <p className="text-xs mt-1">Upload documents to enable smart prefill.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process extractions and compute mapping results
  useEffect(() => {
    if (extractions && extractions.length > 0) {
      const results = new Map<string, MappingResult>();
      
      extractions.forEach(extraction => {
        const mappingResult = mapExtractionToForm(extraction.extracted_data as any, true, false);
        results.set(extraction.id, mappingResult);
      });
      
      setMappingResults(results);
    }
  }, [extractions]);

  const handleApplyExtraction = (extraction: any) => {
    const mappingResult = mappingResults.get(extraction.id);
    
    if (!mappingResult) {
      // Fallback to real-time mapping if cached result not available
      const result = mapExtractionToForm(extraction.extracted_data, true, false);
      const validation = validateMappedData(result.mappedData);
      
      if (!validation.isValid) {
        console.warn('Mapped data validation failed:', validation.errors);
      }
      
      onApplyExtraction(result.mappedData);
      return;
    }

    // Use cached mapping result
    const validation = validateMappedData(mappingResult.mappedData);
    
    if (!validation.isValid) {
      console.warn('Mapped data validation failed:', validation.errors);
    }
    
    onApplyExtraction(mappingResult.mappedData);
  };

  const handleViewDebug = (extraction: any) => {
    setSelectedExtraction(extraction);
    setDebugModalOpen(true);
  };

  const handleFullReview = (extraction: any) => {
    setSelectedExtraction(extraction);
    setFullReviewOpen(true);
  };

  const handleSaveFromReview = (correctedData: any) => {
    // This would typically save to backend, but for form prefill we just apply
    onApplyExtraction(correctedData);
    setFullReviewOpen(false);
  };

  // Get unique extractions (deduplicate by document)
  const uniqueExtractions = extractions.reduce((acc, extraction) => {
    const existing = acc.find(e => e.document_id === extraction.document_id);
    if (!existing || new Date(extraction.created_at) > new Date(existing.created_at)) {
      return [...acc.filter(e => e.document_id !== extraction.document_id), extraction];
    }
    return acc;
  }, [] as typeof extractions);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-primary" />
          Smart Prefill Available
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {uniqueExtractions.slice(0, 3).map((extraction) => {
            const extractedData = extraction.extracted_data as any;
            const confidence = extractedData?.confidence || 0;
            const documentName = (extraction as any).farm_documents?.file_name || 'Document';
            const hasError = extractedData?.error;
            
            // Get mapping result for this extraction
            const mappingResult = mappingResults.get(extraction.id);
            const mappedFieldsCount = mappingResult?.stats.mappedFields || 0;
            const totalFieldsCount = mappingResult?.stats.totalFields || 0;
            const errorFieldsCount = mappingResult?.stats.errorFields || 0;
            const unmappedFieldsCount = Object.keys(mappingResult?.unmappedFields || {}).length;

            // Create preview from mapped data
            const previewItems: string[] = [];
            if (mappingResult?.mappedData) {
              Object.entries(mappingResult.mappedData).slice(0, 3).forEach(([key, value]) => {
                const displayName = getFieldDisplayName(key);
                
                if (Array.isArray(value) && value.length > 0) {
                  previewItems.push(`${displayName}: ${value.join(', ')}`);
                } else if (value && typeof value === 'string') {
                  previewItems.push(`${displayName}: ${value}`);
                } else if (typeof value === 'number') {
                  previewItems.push(`${displayName}: ${value}`);
                }
              });
            }

            return (
              <div key={extraction.id} className="border rounded-lg p-3 bg-background">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{documentName}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {hasError ? (
                        <span className="flex items-center">
                          <XCircle className="h-3 w-3 mr-1 text-red-500" />
                          Extraction failed
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                            {mappedFieldsCount} mapped
                          </span>
                          {errorFieldsCount > 0 && (
                            <span className="flex items-center text-amber-600">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {errorFieldsCount} errors
                            </span>
                          )}
                          {unmappedFieldsCount > 0 && (
                            <span>{unmappedFieldsCount} unmapped</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(extraction.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasError ? (
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    ) : (
                      <Badge variant={confidence > 0.5 ? "default" : "secondary"} className="text-xs">
                        {Math.round(confidence * 100)}% confident
                      </Badge>
                    )}
                    {!hasError && confidence < 0.5 && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                </div>
                
                {hasError ? (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {extractedData.error}
                  </div>
                ) : mappedFieldsCount > 0 ? (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">Mapped Fields Preview:</p>
                      <div className="flex items-center space-x-1 text-xs">
                        {mappingResult?.errors && mappingResult.errors.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {mappingResult.errors.length} errors
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {previewItems.slice(0, 3).map((preview: string, idx: number) => (
                        <p key={idx} className="text-xs text-foreground bg-muted p-1 rounded">
                          {preview}
                        </p>
                      ))}
                      {mappedFieldsCount > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{mappedFieldsCount - 3} more mapped fields
                        </p>
                      )}
                      {unmappedFieldsCount > 0 && (
                        <p className="text-xs text-amber-600">
                          {unmappedFieldsCount} unmapped fields available for review
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                    No mappable data found in this document
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleFullReview(extraction)}
                    disabled={disabled || hasError || mappedFieldsCount === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {mappedFieldsCount > 0 ? `Review & Apply (${mappedFieldsCount})` : 'No Data to Review'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApplyExtraction(extraction)}
                    disabled={disabled || hasError || mappedFieldsCount === 0}
                    variant="outline"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Quick Apply
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleViewDebug(extraction)}
                    variant="outline"
                  >
                    <Bug className="h-3 w-3" />
                  </Button>
                </div>

                {!hasError && (
                  <div className="mt-2 space-y-1">
                    {confidence < 0.5 && mappedFieldsCount > 0 && (
                      <p className="text-xs text-amber-600 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Low confidence - please review all fields carefully
                      </p>
                    )}
                    {mappingResult?.errors && mappingResult.errors.length > 0 && (
                      <p className="text-xs text-red-600 flex items-center">
                        <XCircle className="h-3 w-3 mr-1" />
                        {mappingResult.errors.length} parsing errors occurred
                      </p>
                    )}
                    {confidence > 0.8 && mappedFieldsCount > 5 && (
                      <p className="text-xs text-green-600 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        High quality extraction ready for quick apply
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {uniqueExtractions.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{uniqueExtractions.length - 3} more extractions available
            </p>
          )}
        </div>
      </CardContent>
      
      {/* Full Extraction Review Modal */}
      <Dialog open={fullReviewOpen} onOpenChange={setFullReviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Extracted Data</DialogTitle>
          </DialogHeader>
          {selectedExtraction && (
            <FullExtractionReview
              documentId={selectedExtraction.document_id}
              extraction={selectedExtraction}
              farmId={farmId || 'new'}
              onSave={handleSaveFromReview}
              onApplyToForm={onApplyExtraction}
              currentFormData={currentFormData}
              onFormDataChange={onFormDataChange}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Modal */}
      {selectedExtraction && (
        <ExtractionDebugModal
          isOpen={debugModalOpen}
          onClose={() => setDebugModalOpen(false)}
          extraction={selectedExtraction}
          documentName={selectedExtraction.farm_documents?.file_name || 'Unknown Document'}
        />
      )}
    </Card>
  );
};

export default SmartFormPrefill;