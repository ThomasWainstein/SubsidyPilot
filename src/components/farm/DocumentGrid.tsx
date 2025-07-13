
import React from 'react';
import { FarmDocument } from '@/hooks/useFarmDocuments';
import DocumentCard from './DocumentCard';

interface DocumentGridProps {
  documents: FarmDocument[];
  onDelete: (document: FarmDocument) => void;
  onView: (document: FarmDocument) => void;
  deletingDocumentId?: string;
  farmId: string;
}

const DocumentGrid = ({ documents, onDelete, onView, deletingDocumentId, farmId }: DocumentGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          onDelete={onDelete}
          onView={onView}
          isDeleting={deletingDocumentId === document.id}
          farmId={farmId}
        />
      ))}
    </div>
  );
};

export default DocumentGrid;
