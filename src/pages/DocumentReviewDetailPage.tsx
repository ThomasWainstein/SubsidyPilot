import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentReviewDetail from '@/components/review/DocumentReviewDetail';

const DocumentReviewDetailPage = () => {
  const { farmId, documentId } = useParams<{ farmId: string; documentId: string }>();

  if (!farmId || !documentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Invalid parameters</h1>
          <p className="text-muted-foreground">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <DocumentReviewDetail farmId={farmId} documentId={documentId} />
    </div>
  );
};

export default DocumentReviewDetailPage;