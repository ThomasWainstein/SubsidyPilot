import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  ArrowLeft, 
  FileText, 
  Eye, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Edit,
  History,
  Download,
  RefreshCw
} from 'lucide-react';
import { useDocumentReviewDetail, useSubmitReviewCorrection } from '@/hooks/useDocumentReview';
import { useFarmDocumentExtractionStatus } from '@/hooks/useFarmDocumentExtractionStatus';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import ReExtractButton from './ReExtractButton';
import FullExtractionReview from './FullExtractionReview';

interface DocumentReviewDetailProps {
  farmId: string;
  documentId: string;
}

const DocumentReviewDetail = ({ farmId, documentId }: DocumentReviewDetailProps) => {
  const navigate = useNavigate();
  const { data: documentDetail, isLoading } = useDocumentReviewDetail(documentId);
  const { extractionStatus } = useFarmDocumentExtractionStatus(documentId);
  const submitCorrection = useSubmitReviewCorrection();

  const [extractedFields, setExtractedFields] = useState<Record<string, any>>({});
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'reviewed' | 'flagged' | 'approved'>('reviewed');
  const [hasChanges, setHasChanges] = useState(false);
  const [showFullReview, setShowFullReview] = useState(false);

  const extraction = documentDetail?.document_extractions?.[0];

  useEffect(() => {
    if (extraction?.extracted_data && typeof extraction.extracted_data === 'object') {
      setExtractedFields(extraction.extracted_data as Record<string, any>);
    }
  }, [extraction]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setExtractedFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setHasChanges(true);
  };

  const handleSubmitReview = async () => {
    if (!extraction) {
      toast({
        title: 'Error',
        description: 'No extraction data found for this document.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await submitCorrection.mutateAsync({
        correction: {
          extractionId: extraction.id,
          originalData: extraction.extracted_data as Record<string, any>,
          correctedData: extractedFields,
          reviewerNotes,
          status: reviewStatus
        }
      });
      
      setHasChanges(false);
      navigate(`/farm/${farmId}/document-review`);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const handleExportExtraction = () => {
    const exportData = {
      document: {
        id: documentDetail?.id,
        fileName: documentDetail?.file_name,
        category: documentDetail?.category,
        uploadDate: documentDetail?.uploaded_at
      },
      extraction: extraction ? {
        id: extraction.id,
        status: extraction.status,
        confidence: extraction.confidence_score,
        extractionType: extraction.extraction_type,
        extractedData: extractedFields,
        createdAt: extraction.created_at,
        debugInfo: extraction.debug_info
      } : null,
      review: {
        status: reviewStatus,
        notes: reviewerNotes,
        hasChanges,
        exportDate: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-${documentDetail?.file_name}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = () => {
    switch (extractionStatus.status) {
      case 'completed':
        return extraction?.confidence_score && extraction.confidence_score < 70
          ? <AlertTriangle className="h-5 w-5 text-yellow-500" />
          : <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!documentDetail) {
    return (
      <div className="text-center p-8">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">Document not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/farm/${farmId}/document-review`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Review Queue
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{documentDetail.file_name}</h1>
            <p className="text-sm text-muted-foreground">Document Review & Correction</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(documentDetail.file_url, '_blank')}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Document
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExtraction}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <ReExtractButton 
            documentId={documentId}
            documentName={documentDetail.file_name}
            onSuccess={() => window.location.reload()}
          />
          <Button
            onClick={() => setShowFullReview(!showFullReview)}
            variant="outline"
          >
            {showFullReview ? 'Basic View' : 'Full Review'}
          </Button>
          {!showFullReview && (
            <Button
              onClick={handleSubmitReview}
              disabled={!hasChanges || submitCorrection.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {submitCorrection.isPending ? 'Saving...' : 'Save Review'}
            </Button>
          )}
        </div>
      </div>

      {showFullReview ? (
        <FullExtractionReview
          documentId={documentId}
          extraction={extraction}
          farmId={farmId}
          onSave={(correctedData) => {
            handleSubmitReview();
          }}
          onApplyToForm={(mappedData) => {
            toast({
              title: 'Data Applied',
              description: 'Extracted data has been processed for form application.',
            });
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <Badge variant="secondary" className="mt-1 block w-fit">
                {documentDetail.category}
              </Badge>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Upload Date</label>
              <p className="text-sm mt-1">
                {documentDetail.uploaded_at 
                  ? new Date(documentDetail.uploaded_at).toLocaleDateString()
                  : 'Unknown'
                }
              </p>
            </div>

            {extraction && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Extraction Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon()}
                    <span className="text-sm capitalize">{extractionStatus.status}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Confidence Score</label>
                  <Badge
                    variant="secondary"
                    className={`mt-1 block w-fit ${getConfidenceColor(extraction.confidence_score || 0)}`}
                  >
                    {extraction.confidence_score || 0}%
                  </Badge>
                </div>

                {extractionStatus.fieldCount !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fields Extracted</label>
                    <p className="text-sm mt-1">{extractionStatus.fieldCount}</p>
                  </div>
                )}

                {extractionStatus.lastUpdated && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-sm mt-1">{new Date(extractionStatus.lastUpdated).toLocaleString()}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Extraction Type</label>
                  <p className="text-sm mt-1">{extraction.extraction_type}</p>
                </div>

                {extractionStatus.error && (
                  <div>
                    <label className="text-sm font-medium text-red-600">Error Message</label>
                    <p className="text-sm mt-1 text-red-600">{extractionStatus.error}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Extracted Fields */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Extracted Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {extraction?.extracted_data ? (
              <div className="space-y-4">
                {Object.entries(extractedFields).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <label className="text-sm font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </label>
                    {typeof value === 'string' && value.length > 100 ? (
                      <Textarea
                        value={value}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <Input
                        value={typeof value === 'object' ? JSON.stringify(value) : value || ''}
                        onChange={(e) => {
                          let newValue = e.target.value;
                          try {
                            // Try to parse as JSON if it looks like an object/array
                            if (newValue.startsWith('{') || newValue.startsWith('[')) {
                              newValue = JSON.parse(newValue);
                            }
                          } catch {
                            // Keep as string if not valid JSON
                          }
                          handleFieldChange(key, newValue);
                        }}
                        placeholder={`Enter ${key.replace(/_/g, ' ')}`}
                      />
                    )}
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Review Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as any)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="reviewed">Reviewed & Corrected</option>
                    <option value="approved">Approved as Extracted</option>
                    <option value="flagged">Flagged for Further Review</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reviewer Notes</label>
                  <Textarea
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    placeholder="Add any notes about the review or corrections made..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No extraction data available
                </h3>
                <p className="text-sm text-muted-foreground">
                  This document hasn't been processed yet or extraction failed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
};

export default DocumentReviewDetail;
