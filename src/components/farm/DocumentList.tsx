
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFarmDocuments, useDeleteDocument, type FarmDocument } from '@/hooks/useFarmDocuments';
import { normalizeDocumentCategory } from '@/utils/documentValidation';
import DocumentLoadingState from './DocumentLoadingState';
import DocumentErrorState from './DocumentErrorState';
import DocumentContent from './DocumentContent';

interface DocumentListProps {
  farmId: string;
}

const DocumentList = ({ farmId }: DocumentListProps) => {
  const { data: documents, isLoading, error } = useFarmDocuments(farmId);
  const deleteMutation = useDeleteDocument();

  // Normalize documents to ensure valid categories and log any issues
  const normalizedDocuments = useMemo(() => {
    if (!documents) return [];
    
    let invalidCategoryCount = 0;
    const normalized = documents.map(doc => {
      const originalCategory = doc.category;
      const normalizedCategory = normalizeDocumentCategory(originalCategory);
      
      if (originalCategory !== normalizedCategory) {
        invalidCategoryCount++;
      }
      
      return {
        ...doc,
        category: normalizedCategory
      };
    });

    if (invalidCategoryCount > 0) {
      console.warn(`Found ${invalidCategoryCount} documents with invalid categories that were normalized to "other"`);
    }

    return normalized;
  }, [documents]);

  const handleView = (document: FarmDocument) => {
    window.open(document.file_url, '_blank');
  };

  const handleDelete = async (document: FarmDocument) => {
    try {
      await deleteMutation.mutateAsync({
        documentId: document.id,
        farmId: farmId,
      });
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (isLoading) {
    return <DocumentLoadingState />;
  }

  if (error) {
    return <DocumentErrorState />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({normalizedDocuments?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {normalizedDocuments && normalizedDocuments.length > 0 ? (
          <DocumentContent
            documents={normalizedDocuments}
            onDelete={handleDelete}
            onView={handleView}
            deletingDocumentId={deleteMutation.isPending ? undefined : undefined}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No documents uploaded yet
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Upload your first document using the form above
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentList;
