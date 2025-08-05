export const REQUIRED_DOCUMENT_CATEGORIES = [
  'ownership_proof',
  'id_document',
  'financial'
] as const;

export type RequiredDocumentCategory = typeof REQUIRED_DOCUMENT_CATEGORIES[number];
