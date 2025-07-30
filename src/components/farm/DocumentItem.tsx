
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Trash2, Loader2 } from 'lucide-react';
import { FarmDocument } from '@/hooks/useFarmDocuments';
import { CATEGORY_LABELS, normalizeDocumentCategory } from '@/utils/documentValidation';
import { logger } from '@/lib/logger';

interface DocumentItemProps {
  document: FarmDocument;
  onDelete: (document: FarmDocument) => void;
  onView: (document: FarmDocument) => void;
  isDeleting: boolean;
}

const DocumentItem = ({ document, onDelete, onView, isDeleting }: DocumentItemProps) => {
  // Ensure we have a valid category with robust fallback
  const safeCategory = normalizeDocumentCategory(document.category);
  const categoryLabel = CATEGORY_LABELS[safeCategory] || 'Other';
  
  logger.debug('DocumentItem rendering with category:', document.category, '-> normalized:', safeCategory);
  
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    if (mb >= 1) {
      return `${mb.toFixed(1)} MB`;
    } else {
      return `${kb.toFixed(1)} KB`;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" title={document.file_name}>
              {document.file_name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {categoryLabel}
              </Badge>
            </div>
            <div className="text-xs text-gray-500 mt-1 space-y-1">
              <div>{formatFileSize(document.file_size)}</div>
              <div>Uploaded {formatDate(document.uploaded_at)}</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(document)}
            className="flex items-center space-x-1"
          >
            <Eye className="h-4 w-4" />
            <span>View</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(document)}
            disabled={isDeleting}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Delete</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentItem;
