
import React, { useState, useMemo } from 'react';
import { FarmDocument } from '@/hooks/useFarmDocuments';
import { VALID_DOCUMENT_CATEGORIES } from '@/utils/documentValidation';
import DocumentFilters from './DocumentFilters';
import DocumentGrid from './DocumentGrid';
import DocumentEmptyState from './DocumentEmptyState';

interface DocumentContentProps {
  documents: FarmDocument[];
  onDelete: (document: FarmDocument) => void;
  onView: (document: FarmDocument) => void;
  deletingDocumentId?: string;
}

const DocumentContent = ({ documents, onDelete, onView, deletingDocumentId }: DocumentContentProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Get unique valid categories from documents
  const availableCategories = useMemo(() => {
    if (!documents) return [];
    
    const documentCategories = Array.from(new Set(documents.map(doc => doc.category)));
    // Only return categories that are both in documents and in our valid list
    return documentCategories.filter(cat => VALID_DOCUMENT_CATEGORIES.includes(cat)).sort();
  }, [documents]);

  // Filter documents based on search and category
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    return documents.filter(doc => {
      const matchesSearch = !searchTerm || 
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || doc.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchTerm, selectedCategory]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  // Safe category change handler
  const handleCategoryChange = (category: string) => {
    // Only allow valid categories or empty string for clearing
    if (category === '' || VALID_DOCUMENT_CATEGORIES.includes(category)) {
      setSelectedCategory(category);
    } else {
      console.warn('Attempted to set invalid category:', category);
      setSelectedCategory('');
    }
  };

  const hasActiveFilters = searchTerm || selectedCategory;

  return (
    <>
      <DocumentFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        categories={availableCategories}
        totalDocuments={documents.length}
        filteredCount={filteredDocuments.length}
        onClearFilters={handleClearFilters}
      />
      
      {filteredDocuments.length > 0 ? (
        <DocumentGrid
          documents={filteredDocuments}
          onDelete={onDelete}
          onView={onView}
          deletingDocumentId={deletingDocumentId}
        />
      ) : (
        <DocumentEmptyState 
          hasDocuments={documents.length > 0}
          hasFilters={hasActiveFilters}
        />
      )}
    </>
  );
};

export default DocumentContent;
