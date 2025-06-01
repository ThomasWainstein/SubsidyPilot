
// Document validation utilities for maintaining data integrity

export const VALID_DOCUMENT_CATEGORIES = ['legal', 'financial', 'environmental', 'technical', 'certification', 'other'] as const;

export type DocumentCategory = typeof VALID_DOCUMENT_CATEGORIES[number];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  'legal': 'Legal Documents',
  'financial': 'Financial Records',
  'environmental': 'Environmental Permits',
  'technical': 'Technical Documentation',
  'certification': 'Certifications',
  'other': 'Other'
};

/**
 * Validates and normalizes a document category value
 * @param category - The category value to validate
 * @returns A valid DocumentCategory, defaulting to 'other' if invalid
 */
export const normalizeDocumentCategory = (category: unknown): DocumentCategory => {
  if (!category || typeof category !== 'string') {
    console.warn('Invalid category type:', typeof category, category);
    return 'other';
  }
  
  const trimmed = category.trim().toLowerCase();
  
  if (!trimmed || trimmed === '') {
    console.warn('Empty category string');
    return 'other';
  }
  
  if (VALID_DOCUMENT_CATEGORIES.includes(trimmed as DocumentCategory)) {
    return trimmed as DocumentCategory;
  }
  
  console.warn('Unknown category, defaulting to "other":', category);
  return 'other';
};

/**
 * Validates an array of categories, filtering out invalid ones
 * @param categories - Array of category strings
 * @returns Array of valid DocumentCategory values
 */
export const filterValidCategories = (categories: unknown[]): DocumentCategory[] => {
  if (!Array.isArray(categories)) {
    console.warn('Categories is not an array:', categories);
    return [];
  }
  
  return categories
    .map(normalizeDocumentCategory)
    .filter((category, index, arr) => arr.indexOf(category) === index) // Remove duplicates
    .sort();
};

/**
 * Checks if a value is a valid document category
 * @param value - Value to check
 * @returns True if the value is a valid DocumentCategory
 */
export const isValidDocumentCategory = (value: unknown): value is DocumentCategory => {
  return typeof value === 'string' && 
         VALID_DOCUMENT_CATEGORIES.includes(value as DocumentCategory);
};

/**
 * Validation function for database queries to detect invalid categories
 * @param documents - Array of documents from database
 * @returns Report of validation issues
 */
export const validateDocumentCategories = (documents: Array<{ id: string; category: unknown; file_name: string }>) => {
  const issues: Array<{ id: string; file_name: string; category: unknown; issue: string }> = [];
  
  documents.forEach(doc => {
    if (!doc.category) {
      issues.push({
        id: doc.id,
        file_name: doc.file_name,
        category: doc.category,
        issue: 'Category is null or undefined'
      });
    } else if (typeof doc.category !== 'string') {
      issues.push({
        id: doc.id,
        file_name: doc.file_name,
        category: doc.category,
        issue: 'Category is not a string'
      });
    } else if (doc.category.trim() === '') {
      issues.push({
        id: doc.id,
        file_name: doc.file_name,
        category: doc.category,
        issue: 'Category is empty string'
      });
    } else if (!VALID_DOCUMENT_CATEGORIES.includes(doc.category as DocumentCategory)) {
      issues.push({
        id: doc.id,
        file_name: doc.file_name,
        category: doc.category,
        issue: 'Category is not in valid list'
      });
    }
  });
  
  return {
    totalDocuments: documents.length,
    validDocuments: documents.length - issues.length,
    issues,
    hasIssues: issues.length > 0
  };
};
