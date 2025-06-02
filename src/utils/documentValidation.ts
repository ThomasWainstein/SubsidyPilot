
// Document category validation and utilities

export const VALID_DOCUMENT_CATEGORIES = [
  'legal',
  'financial', 
  'environmental',
  'technical',
  'certification',
  'other'
] as const;

export type DocumentCategory = typeof VALID_DOCUMENT_CATEGORIES[number];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  legal: 'Legal Documents',
  financial: 'Financial Records',
  environmental: 'Environmental Reports',
  technical: 'Technical Documentation',
  certification: 'Certifications',
  other: 'Other Documents'
};

export const isValidDocumentCategory = (category: unknown): category is DocumentCategory => {
  return typeof category === 'string' && 
         category.trim() !== '' &&
         VALID_DOCUMENT_CATEGORIES.includes(category as DocumentCategory);
};

export const normalizeDocumentCategory = (category: unknown): DocumentCategory => {
  if (!category || typeof category !== 'string') {
    console.warn('Invalid category type, defaulting to "other":', typeof category, category);
    return 'other';
  }
  
  const trimmed = category.trim().toLowerCase() as DocumentCategory;
  
  // Fix: Check for empty string properly
  if (!trimmed) {
    console.warn('Empty category string, defaulting to "other"');
    return 'other';
  }
  
  if (isValidDocumentCategory(trimmed)) {
    return trimmed;
  }
  
  console.warn('Unknown category, normalizing to "other":', category);
  return 'other';
};

export const getCategoryDisplayName = (category: string): string => {
  const normalizedCategory = normalizeDocumentCategory(category);
  return CATEGORY_LABELS[normalizedCategory];
};

// Validation for document upload
export const validateDocumentUpload = (file: File, category: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Validate file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size must be less than 50MB');
  }
  
  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not supported. Please upload PDF, DOC, DOCX, XLS, XLSX, JPG, or PNG files');
  }
  
  // Validate category
  if (!isValidDocumentCategory(category)) {
    errors.push('Please select a valid document category');
  }
  
  // Validate filename (basic sanitation check)
  if (file.name.length > 255) {
    errors.push('Filename is too long (maximum 255 characters)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
