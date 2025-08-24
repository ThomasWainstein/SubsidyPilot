import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Edit3, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedField {
  value: string | null;
  confidence: number;
  source_snippet?: string;
}

interface ExtractionData {
  document_type: string;
  fields: Record<string, ExtractedField>;
  processing_metadata: {
    tier_used: string;
    retry_count: number;
    validation_errors: string[];
    needs_manual_review: boolean;
    text_length: number;
  };
}

interface ExtractionReviewProps {
  extractionId: string;
  onReviewComplete?: () => void;
}

const ExtractionReviewInterface: React.FC<ExtractionReviewProps> = ({
  extractionId,
  onReviewComplete
}) => {
  const [extraction, setExtraction] = useState<any>(null);
  const [extractionData, setExtractionData] = useState<ExtractionData | null>(null);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExtractionData();
  }, [extractionId]);

  const fetchExtractionData = async () => {
    try {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('id', extractionId)
        .single();

      if (error) throw error;

      setExtraction(data);
      const parsedData = data.extracted_data as unknown as ExtractionData;
      setExtractionData(parsedData);
      
      // Initialize edited data with current values
      const initialEdits: Record<string, string> = {};
      if (parsedData?.fields) {
        Object.entries(parsedData.fields).forEach(([key, field]: [string, any]) => {
          initialEdits[key] = field.value || '';
        });
      }
      setEditedData(initialEdits);
      
    } catch (error) {
      console.error('Error fetching extraction:', error);
      toast.error('Failed to load extraction data');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 0.6) return <AlertTriangle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };

  const handleFieldEdit = (fieldName: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const submitReview = async () => {
    setIsSubmitting(true);
    try {
      // Create corrected data structure
      const correctedFields: Record<string, ExtractedField> = {};
      
      Object.entries(editedData).forEach(([key, value]) => {
        const originalField = extractionData?.fields[key];
        correctedFields[key] = {
          value: value || null,
          confidence: value === originalField?.value ? originalField.confidence : 1.0,
          source_snippet: originalField?.source_snippet || ''
        };
      });

      // Update extraction with reviewed data
      const { error: updateError } = await supabase
        .from('document_extractions')
        .update({
          status_v2: 'completed',
          extracted_data: JSON.stringify({
            ...extractionData,
            fields: correctedFields,
            processing_metadata: {
              ...extractionData?.processing_metadata,
              manually_reviewed: true,
              reviewed_at: new Date().toISOString()
            }
          }),
          confidence_score: 1.0, // Full confidence after manual review
          updated_at: new Date().toISOString()
        })
        .eq('id', extractionId);

      if (updateError) throw updateError;

      // Store review record
      const { error: reviewError } = await supabase
        .from('document_extraction_reviews')
        .insert({
          extraction_id: extractionId,
          reviewer_id: (await supabase.auth.getUser()).data.user?.id,
          original_data: JSON.stringify(extractionData?.fields || {}),
          corrected_data: JSON.stringify(correctedFields),
          review_status: 'reviewed',
          reviewer_notes: `Manual review completed. ${Object.keys(editedData).length} fields reviewed.`
        });

      if (reviewError) throw reviewError;

      toast.success('Review submitted successfully');
      onReviewComplete?.();
      
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading extraction data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!extractionData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No extraction data found for this document.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Document Extraction Review</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {extractionData.document_type.toUpperCase()}
              </Badge>
              <Badge 
                variant="outline" 
                className={getConfidenceColor(extraction.confidence_score)}
              >
                {Math.round(extraction.confidence_score * 100)}% Confidence
              </Badge>
              {extractionData.processing_metadata.needs_manual_review && (
                <Badge variant="destructive">Needs Review</Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Processing Tier</Label>
              <p className="font-medium capitalize">{extractionData.processing_metadata.tier_used}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Retry Count</Label>
              <p className="font-medium">{extractionData.processing_metadata.retry_count}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Text Length</Label>
              <p className="font-medium">{extractionData.processing_metadata.text_length} chars</p>
            </div>
          </div>
          
          {extractionData.processing_metadata.validation_errors.length > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Validation Issues:</strong>
                <ul className="list-disc list-inside mt-1">
                  {extractionData.processing_metadata.validation_errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Extracted Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(extractionData.fields).map(([fieldName, field]) => (
            <div key={fieldName} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  {getConfidenceIcon(field.confidence)}
                  <span className="capitalize">{fieldName.replace(/_/g, ' ')}</span>
                </Label>
                <Badge 
                  variant="outline" 
                  className={`${getConfidenceColor(field.confidence)} text-xs`}
                >
                  {Math.round(field.confidence * 100)}%
                </Badge>
              </div>
              
              <Input
                value={editedData[fieldName] || ''}
                onChange={(e) => handleFieldEdit(fieldName, e.target.value)}
                placeholder={`Enter ${fieldName.replace(/_/g, ' ')}`}
                className={field.confidence < 0.7 ? 'border-yellow-300 bg-yellow-50' : ''}
              />
              
              {field.source_snippet && (
                <p className="text-xs text-muted-foreground italic">
                  Source: "{field.source_snippet}"
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Raw Text Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Source Document</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawText(!showRawText)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showRawText ? 'Hide' : 'Show'} Raw Text
            </Button>
          </CardTitle>
        </CardHeader>
        {showRawText && (
          <CardContent>
            <Textarea
              value={extraction.document_markdown || 'No raw text available'}
              readOnly
              className="min-h-[200px] font-mono text-sm"
            />
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={submitReview}
          disabled={isSubmitting}
          className="flex items-center gap-2"
        >
          <Edit3 className="h-4 w-4" />
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
};

export default ExtractionReviewInterface;