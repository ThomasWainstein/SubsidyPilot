import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText, 
  Eye, 
  Calendar, 
  HardDrive,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import ManualExtractionButton from './ManualExtractionButton';
import { useLatestDocumentExtraction } from '@/hooks/useDocumentExtractions';
import { useFarmDocuments, useDeleteDocument } from '@/hooks/useFarmDocuments';

interface DocumentListTableProps {
  farmId: string;
}

const DocumentListTable = ({ farmId }: DocumentListTableProps) => {
  const { t } = useLanguage();
  const { data: documents = [], isLoading } = useFarmDocuments(farmId);
  const deleteDocumentMutation = useDeleteDocument();

  const handleView = (document: any) => {
    window.open(document.file_url, '_blank');
  };

  const handleDelete = async (document: any) => {
    if (confirm(`Are you sure you want to delete "${document.file_name}"?`)) {
      await deleteDocumentMutation.mutateAsync(document.id);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      legal: 'bg-blue-100 text-blue-800',
      financial: 'bg-green-100 text-green-800',
      environmental: 'bg-emerald-100 text-emerald-800',
      technical: 'bg-purple-100 text-purple-800',
      certification: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  const ExtractionStatus = ({ document }: { document: any }) => {
    const { data: extraction } = useLatestDocumentExtraction(document.id);
    
    if (!extraction) {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Ready to Extract
          </Badge>
        </div>
      );
    }

    const getStatusIcon = () => {
      switch (extraction.status) {
        case 'completed':
          return <CheckCircle className="h-3 w-3 text-green-600" />;
        case 'failed':
          return <AlertCircle className="h-3 w-3 text-red-600" />;
        case 'pending':
          return <Clock className="h-3 w-3 text-blue-600" />;
        default:
          return <Sparkles className="h-3 w-3 text-gray-600" />;
      }
    };

    const getStatusColor = () => {
      switch (extraction.status) {
        case 'completed':
          return 'bg-green-100 text-green-800';
        case 'failed':
          return 'bg-red-100 text-red-800';
        case 'pending':
          return 'bg-blue-100 text-blue-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="flex flex-col gap-1">
        <Badge variant="secondary" className={`text-xs ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="ml-1">
            {extraction.status === 'completed' && `Extracted (${extraction.confidence_score || 0}%)`}
            {extraction.status === 'failed' && 'Failed'}
            {extraction.status === 'pending' && 'Processing...'}
          </span>
        </Badge>
        {extraction.error_message && (
          <span className="text-xs text-red-600" title={extraction.error_message}>
            {extraction.error_message.substring(0, 30)}...
          </span>
        )}
      </div>
    );
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
          <p className="text-gray-500">Start by uploading your first document above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>AI Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded bg-gray-100">
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{document.file_name}</div>
                      <div className="text-xs text-gray-500">{document.mime_type}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`${getCategoryColor(document.category)} text-xs`}>
                    <Tag className="h-3 w-3 mr-1" />
                    {document.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatFileSize(document.file_size)}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {document.uploaded_at 
                      ? formatDistanceToNow(new Date(document.uploaded_at), { addSuffix: true })
                      : 'Unknown'
                    }
                  </div>
                </TableCell>
                <TableCell>
                  <ExtractionStatus document={document} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <ManualExtractionButton
                      documentId={document.id}
                      farmId={farmId}
                      fileName={document.file_name}
                      fileUrl={document.file_url}
                      category={document.category}
                      className="text-xs h-7 px-2"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(document)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(document)}
                      disabled={deleteDocumentMutation.isPending}
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DocumentListTable;