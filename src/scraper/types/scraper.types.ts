/**
 * Type definitions for the Universal Content Harvester
 */

export interface SourceReference {
  kind: 'webpage' | 'document';
  url?: string;
  filename?: string;
  page_number?: number;
  selector?: string;
  timestamp: string;
}

export interface ContentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'table';
  verbatim: true; // Always true for verbatim preservation
  
  // Content in multiple formats
  html_content?: string;
  markdown_content?: string;
  plain_text?: string;
  
  // Table-specific structure
  table_columns?: string[];
  table_rows?: any[][];
  table_caption?: string;
  
  // List-specific structure
  list_ordered?: boolean;
  list_items?: string[];
  
  // Heading-specific structure
  heading_level?: number;
  heading_text?: string;
  
  // Source reference
  source_ref: SourceReference;
}

export interface ScrapedDocument {
  id: string;
  name: string;
  doc_type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'other';
  url: string;
  content_hash: string;
  size_bytes?: number;
  mime_type?: string;
  language?: string;
  pages?: number;
  
  // Extracted content
  extracted_text?: string;
  tables_extracted?: any[];
  
  // Source reference
  source_ref: SourceReference;
  
  // Extraction metadata
  extraction_status?: 'pending' | 'completed' | 'failed';
  extraction_metadata?: Record<string, any>;
}

export interface ScrapeBundle {
  id: string;
  source: SourceReference;
  lang: string;
  content_hash: string;
  last_modified: string;
  blocks: ContentBlock[];
  documents: ScrapedDocument[];
  metadata?: {
    harvester_version?: string;
    harvest_timestamp?: string;
    run_id?: string;
    session_id?: string;
    url_normalized?: string;
    quality_score?: number;
    extraction_method?: string;
    [key: string]: any;
  };
}

export interface HarvestConfig {
  preserveFormatting?: boolean;
  extractTables?: boolean;
  extractDocuments?: boolean;
  verbatimOnly?: boolean;
  maxRetries?: number;
  timeout?: number;
  userAgent?: string;
  delayMs?: number;
  batchSize?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score?: number;
}

export interface TableData {
  columns: string[];
  rows: any[][];
  caption?: string;
}

export interface ListData {
  ordered: boolean;
  items: string[];
}

export interface HeadingData {
  level: number;
  text: string;
}