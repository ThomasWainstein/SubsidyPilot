/**
 * Document validation and health checking utilities
 */

// Document category types and validation
export type DocumentCategory = 
  | 'contracts'
  | 'land_certificates' 
  | 'financial_statements'
  | 'compliance_reports'
  | 'insurance_documents'
  | 'permits_licenses'
  | 'invoices_receipts'
  | 'tax_documents'
  | 'other';

export const VALID_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'contracts',
  'land_certificates',
  'financial_statements', 
  'compliance_reports',
  'insurance_documents',
  'permits_licenses',
  'invoices_receipts',
  'tax_documents',
  'other'
];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  contracts: 'Contracts',
  land_certificates: 'Land Certificates',
  financial_statements: 'Financial Statements',
  compliance_reports: 'Compliance Reports', 
  insurance_documents: 'Insurance Documents',
  permits_licenses: 'Permits & Licenses',
  invoices_receipts: 'Invoices & Receipts',
  tax_documents: 'Tax Documents',
  other: 'Other'
};

export function isValidDocumentCategory(category: string): category is DocumentCategory {
  return VALID_DOCUMENT_CATEGORIES.includes(category as DocumentCategory);
}

export function normalizeDocumentCategory(category: string): DocumentCategory {
  if (isValidDocumentCategory(category)) {
    return category;
  }
  return 'other';
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDocumentUpload(file: File, category: string): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // File size validation (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('File size exceeds 50MB limit');
  }
  
  // File type validation
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not supported');
  }
  
  // Category validation
  if (!isValidDocumentCategory(category)) {
    errors.push('Invalid document category');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export interface DocumentHealthCheck {
  url: string;
  isAccessible: boolean;
  responseTime: number;
  status: number | null;
  lastChecked: Date;
  error?: string;
}

export async function validateDocumentUrl(url: string): Promise<DocumentHealthCheck> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      url,
      isAccessible: response.status >= 200 && response.status < 400,
      responseTime,
      status: response.status,
      lastChecked: new Date()
    };
  } catch (error) {
    return {
      url,
      isAccessible: false,
      responseTime: Date.now() - startTime,
      status: null,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}