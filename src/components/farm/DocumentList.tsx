
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { File } from 'lucide-react';
import { useFarmDocuments, useDeleteDocument, type FarmDocument } from '@/hooks/useFarmDocuments';
import { toast } from '@/components/ui/use-toast';
import DocumentGrid from './DocumentGrid';
import DocumentFilters from './DocumentFilters';

interface DocumentListProps {
  farmId: string;
}

const DocumentList = ({ farmId }: DocumentListProps) => {
  const { data: documents, isLoading, error } = useFarmDocuments(farmId);
  const deleteMutation = useDeleteDocument();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Get unique categories from documents
  const categories = useMemo(() => {
    if (!documents) return [];
    return Array.from(new Set(documents.map(doc => doc.category))).sort();
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
        <CardTitle>Documents ({documents?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {documents && documents.length > 0 ? (
          <>
            <DocumentFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              categories={categories}
              totalDocuments={documents.length}
              filteredCount={filteredDocuments.length}
              onClearFilters={handleClearFilters}
            />
            
            {filteredDocuments.length > 0 ? (
              <DocumentGrid
                documents={filteredDocuments}
                onDelete={handleDelete}
                onView={handleView}
                deletingDocumentId={deleteMutation.isPending ? undefined : undefined}
              />
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
