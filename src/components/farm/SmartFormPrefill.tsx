import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, AlertTriangle } from 'lucide-react';
import { useFarmDocumentExtractions } from '@/hooks/useDocumentExtractions';

interface SmartFormPrefillProps {
  farmId: string;
  onApplyExtraction: (extractedData: any) => void;
  disabled?: boolean;
}

const SmartFormPrefill: React.FC<SmartFormPrefillProps> = ({
  farmId,
  onApplyExtraction,
  disabled = false
}) => {
  const { data: extractions, isLoading } = useFarmDocumentExtractions(farmId);

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

  const handleApplyExtraction = (extraction: any) => {
    const extractedData = extraction.extracted_data as any;
    
    // Map extracted fields to form fields
    const mappedData: any = {};
    
    if (extractedData.farmName) mappedData.name = extractedData.farmName;
    if (extractedData.ownerName) mappedData.ownerName = extractedData.ownerName;
    if (extractedData.address) mappedData.address = extractedData.address;
    if (extractedData.totalHectares) mappedData.total_hectares = extractedData.totalHectares;
    if (extractedData.legalStatus) mappedData.legal_status = extractedData.legalStatus;
    if (extractedData.registrationNumber) mappedData.cnp_or_cui = extractedData.registrationNumber;
    if (extractedData.revenue) mappedData.revenue = extractedData.revenue;
    if (extractedData.certifications) mappedData.certifications = extractedData.certifications;
    if (extractedData.activities) mappedData.land_use_types = extractedData.activities;

    onApplyExtraction(mappedData);
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
            const extractedFields = extractedData?.extractedFields || [];
            const documentName = extraction.farm_documents?.file_name || 'Document';
            const hasError = extractedData?.error;

            // Preview of extracted values
            const extractedValues = extractedFields.slice(0, 3).map((field: string) => {
              const value = extractedData[field];
              if (Array.isArray(value) && value.length > 0) return `${field}: ${value.join(', ')}`;
              if (value && typeof value === 'string') return `${field}: ${value}`;
              if (typeof value === 'number') return `${field}: ${value}`;
              return null;
            }).filter(Boolean);

            return (
              <div key={extraction.id} className="border rounded-lg p-3 bg-background">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{documentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasError ? 'Extraction failed' : `${extractedFields.length} fields extracted`}
                    </p>
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
                ) : extractedFields.length > 0 ? (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                    <div className="space-y-1">
                      {extractedValues.slice(0, 3).map((preview: string, idx: number) => (
                        <p key={idx} className="text-xs text-foreground bg-muted p-1 rounded">
                          {preview}
                        </p>
                      ))}
                      {extractedFields.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{extractedFields.length - 3} more fields
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                    No extractable data found in this document
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => handleApplyExtraction(extraction)}
                  disabled={disabled || hasError || extractedFields.length === 0}
                  className="w-full"
                  variant={extractedFields.length > 0 ? "default" : "outline"}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {extractedFields.length > 0 ? 'Apply to Form' : 'No Data to Apply'}
                </Button>

                {!hasError && confidence < 0.5 && extractedFields.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Low confidence - please review all fields carefully
                  </p>
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
    </Card>
  );
};

export default SmartFormPrefill;