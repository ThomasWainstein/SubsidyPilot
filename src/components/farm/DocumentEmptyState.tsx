
import React from 'react';
import { File } from 'lucide-react';

interface DocumentEmptyStateProps {
  hasDocuments: boolean;
  hasFilters: boolean;
}

const DocumentEmptyState = ({ hasDocuments, hasFilters }: DocumentEmptyStateProps) => {
  if (!hasDocuments) {
    return (
      <div className="text-center py-8">
        <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No documents uploaded yet
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Upload your first document using the form above
        </p>
      </div>
    );
  }

  if (hasFilters) {
    return (
      <div className="text-center py-8">
        <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No documents match your filters
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Try adjusting your search or category filter
        </p>
      </div>
    );
  }

  return null;
};

export default DocumentEmptyState;
