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
          {extractions.slice(0, 3).map((extraction) => {
            const extractedData = extraction.extracted_data as any;
            const confidence = extractedData?.confidence || 0;
            const extractedFields = extractedData?.extractedFields || [];
            const documentName = extraction.farm_documents?.file_name || 'Document';

            return (
              <div key={extraction.id} className="border rounded-lg p-3 bg-background">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{documentName}</p>
                    <p className="text-xs text-muted-foreground">
                      {extractedFields.length} fields extracted
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={confidence > 0.7 ? "default" : "secondary"} className="text-xs">
                      {Math.round(confidence * 100)}% confident
                    </Badge>
                    {confidence < 0.7 && (
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    )}
                  </div>
                </div>
                
                {extractedFields.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Extracted fields:</p>
                    <div className="flex flex-wrap gap-1">
                      {extractedFields.slice(0, 4).map((field: string) => (
                        <Badge key={field} variant="outline" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                      {extractedFields.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{extractedFields.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => handleApplyExtraction(extraction)}
                  disabled={disabled}
                  className="w-full"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Apply to Form
                </Button>

                {confidence < 0.7 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Low confidence - please review all fields carefully
                  </p>
                )}
              </div>
            );
          })}
          
          {extractions.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{extractions.length - 3} more extractions available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartFormPrefill;