
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { File } from 'lucide-react';
import { useFarmDocuments, useDeleteDocument, type FarmDocument } from '@/hooks/useFarmDocuments';
import DocumentGrid from './DocumentGrid';
import DocumentFilters from './DocumentFilters';
import DocumentItem from './DocumentItem';

interface DocumentListProps {
  farmId: string;
}

// Valid categories that match our form and database enum
const VALID_CATEGORIES = ['legal', 'financial', 'environmental', 'technical', 'certification', 'other'];

const DocumentList = ({ farmId }: DocumentListProps) => {
  const { data: documents, isLoading, error } = useFarmDocuments(farmId);
  const deleteMutation = useDeleteDocument();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Normalize documents to ensure valid categories
  const normalizedDocuments = useMemo(() => {
    if (!documents) return [];
    
    return documents.map(doc => ({
      ...doc,
      category: VALID_CATEGORIES.includes(doc.category) ? doc.category : 'other'
    }));
  }, [documents]);

  // Get unique categories from normalized documents
  const categories = useMemo(() => {
    if (!normalizedDocuments) return [];
    return Array.from(new Set(normalizedDocuments.map(doc => doc.category))).sort();
  }, [normalizedDocuments]);

  // Filter documents based on search and category
  const filteredDocuments = useMemo(() => {
    if (!normalizedDocuments) return [];
    
    return normalizedDocuments.filter(doc => {
      const matchesSearch = !searchTerm || 
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || doc.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [normalizedDocuments, searchTerm, selectedCategory]);

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

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter skeleton */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
            </div>
            <Skeleton className="h-6 w-64" />
          </div>
          
          {/* Grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">
              Error loading documents. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({normalizedDocuments?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {normalizedDocuments && normalizedDocuments.length > 0 ? (
          <>
            <DocumentFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={categories}
              totalDocuments={normalizedDocuments.length}
              filteredCount={filteredDocuments.length}
              onClearFilters={handleClearFilters}
            />
            
            {filteredDocuments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((document) => (
                  <DocumentItem
                    key={document.id}
                    document={document}
                    onDelete={handleDelete}
                    onView={handleView}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No documents match your filters
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Try adjusting your search or category filter
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
