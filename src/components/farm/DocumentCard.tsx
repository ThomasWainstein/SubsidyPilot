import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  ExternalLink,
  Trash2,
  Calendar,
  Tag,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  Code,
} from 'lucide-react';
import { FarmDocument } from '@/hooks/useFarmDocuments';
import { useFarmDocumentStatus } from '@/hooks/useFarmDocumentStatus';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ManualExtractionButton from './ManualExtractionButton';
import AIExtractionSummaryPanel from '@/components/ai/AIExtractionSummaryPanel';
import { useAIExtractionTracker } from '@/hooks/useAIExtractionTracker';

interface DocumentCardProps {
  document: FarmDocument;
  onDelete: (document: FarmDocument) => void;
  onView: (document: FarmDocument) => void;
  isDeleting?: boolean;
  farmId: string;
}

const DocumentCard = ({ document, onDelete, onView, isDeleting = false, farmId }: DocumentCardProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: extractionStatus } = useFarmDocumentStatus(document.id);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const { latestAttempt, downloadExtractionLog } = useAIExtractionTracker({ documentId: document.id });
  const getDocumentIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-6 w-6 text-gray-500" />;
    
    if (mimeType.includes('pdf')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    }
    if (mimeType.includes('image')) {
      return <FileImage className="h-6 w-6 text-blue-500" />;
    }
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      legal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      financial: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      environmental: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
      technical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      certification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    };
    return colors[category] || colors.other;
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
  };

  const renderExtractionBadge = () => {
    if (!extractionStatus || extractionStatus.status === 'not_extracted') {
      return (
        <Badge variant="outline" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          {t('common.readyToExtract')}
        </Badge>
      );
    }

    switch (extractionStatus.status) {
      case 'completed':
        return (
          <Badge
            variant="secondary"
            className={`${getConfidenceColor(extractionStatus.confidence_score)} text-xs`}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {`${t('common.extractionAvailable')} (${Math.round(extractionStatus.confidence_score ?? 0)}%)`}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('common.extractionFailed')}
          </Badge>
        );
      case 'processing':
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {t('status.processing')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {t('common.readyToExtract')}
          </Badge>
        );
    }
  };

  const handlePrefillClick = () => {
    if (extractionStatus?.status === 'completed') {
      navigate(`/farm/${farmId}/edit?prefill=true&extractionId=${document.id}`);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="group hover:shadow-md transition-all duration-200 border hover:border-gray-300 dark:hover:border-gray-600">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">
                {getDocumentIcon(document.mime_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                  {document.file_name}
                </h4>
                <div className="flex items-center space-x-2 mt-2 flex-wrap gap-1">
                  <Badge
                    variant="secondary"
                    className={`${getCategoryColor(document.category)} text-xs`}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {document.category}
                  </Badge>
                  {renderExtractionBadge()}
                </div>
                {extractionStatus?.error_message && (
                  <div
                    className="mt-1 text-xs text-red-600"
                    title={extractionStatus.error_message}
                  >
                    {extractionStatus.error_message.substring(0, 30)}...
                  </div>
                )}
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(document.uploaded_at)}
                  </span>
                  <span>{formatFileSize(document.file_size)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-2">
              {extractionStatus?.status === 'completed' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePrefillClick}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 h-auto"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('common.useToPrefillProfile')}
                </Button>
              )}
              
              {/* AI Debug Button - shows if extraction attempted */}
              {latestAttempt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 h-auto"
                  title="Show AI extraction details"
                >
                  <Code className="h-3 w-3 mr-1" />
                  AI Debug
                </Button>
              )}
              
              {/* Manual extraction button for all documents */}
              <ManualExtractionButton
                documentId={document.id}
                farmId={farmId}
                fileName={document.file_name}
                fileUrl={document.file_url}
                category={document.category}
                hasExistingExtraction={extractionStatus?.status === 'completed'}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 h-auto"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(document)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Document</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{document.file_name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(document)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Extraction Summary Panel */}
      {showDebugPanel && latestAttempt && (
        <AIExtractionSummaryPanel
          extraction={{
            documentId: document.id,
            fileName: document.file_name,
            extractionId: latestAttempt.id,
            status: latestAttempt.status as any,
            confidence: latestAttempt.confidence,
            fieldsExtracted: latestAttempt.extractedFieldsCount,
            totalFields: latestAttempt.extractedFieldsCount,
            fieldsSaved: latestAttempt.savedFieldsCount,
            qaPassed: latestAttempt.status === 'completed',
            qaScore: latestAttempt.confidence,
            model: latestAttempt.model,
            tokensUsed: latestAttempt.tokensUsed,
            processingTime: latestAttempt.processingTime,
            lastAttempt: latestAttempt.createdAt,
            errorMessage: latestAttempt.errorMessage,
            extractedData: latestAttempt.extractedData,
            mappedData: latestAttempt.mappedData,
            validationErrors: latestAttempt.validationErrors,
            unmappedFields: latestAttempt.unmappedFields
          }}
          onRetryExtraction={() => {
            // Trigger manual extraction button
            // Trigger manual extraction retry
          }}
          onApplyToProfile={() => {
            navigate(`/farm/${farmId}/edit?prefill=true&extractionId=${document.id}`);
          }}
          onViewDetails={() => {
            // Show extraction details modal
          }}
          onDownloadLog={() => {
            if (latestAttempt) {
              downloadExtractionLog(latestAttempt);
            }
          }}
        />
      )}
    </div>
  );
};

export default DocumentCard;