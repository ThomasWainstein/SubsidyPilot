
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from 'lucide-react';

interface DocumentFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  totalDocuments: number;
  filteredCount: number;
  onClearFilters: () => void;
}

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
  'legal': 'Legal Documents',
  'financial': 'Financial Records',
  'environmental': 'Environmental Permits',
  'technical': 'Technical Documentation',
  'certification': 'Certifications',
  'other': 'Other'
};

const DocumentFilters = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  totalDocuments,
  filteredCount,
  onClearFilters
}: DocumentFiltersProps) => {
  const hasActiveFilters = searchTerm || selectedCategory;

  // Safe category change handler
  const handleCategoryChange = (value: string) => {
    // Only allow valid categories or empty string for clearing
    if (value === '' || categories.includes(value)) {
      onCategoryChange(value);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory || ''} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {categories
              .filter(category => category && category.trim() !== '') // Filter out invalid categories
              .map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category] || category}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {hasActiveFilters ? (
            <>Showing {filteredCount} of {totalDocuments} documents</>
          ) : (
            <>{totalDocuments} document{totalDocuments !== 1 ? 's' : ''} total</>
          )}
        </p>
        
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
};

export default DocumentFilters;
