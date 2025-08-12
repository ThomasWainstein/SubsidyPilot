/**
 * Validation Engine - Validates scraped content and structure
 */

import { ScrapeBundle, ContentBlock, ScrapedDocument, ValidationResult, HarvestConfig } from '../types/scraper.types';

export class ValidationEngine {
  private config: HarvestConfig;

  constructor(config: HarvestConfig) {
    this.config = config;
  }

  /**
   * Validate complete scrape bundle
   */
  async validateBundle(bundle: ScrapeBundle): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Basic structure validation
    if (!bundle.id || !bundle.source || !bundle.lang || !bundle.content_hash) {
      errors.push('Missing required bundle fields');
      score -= 20;
    }

    // Content hash validation
    if (bundle.content_hash && !this.isValidSHA256(bundle.content_hash)) {
      errors.push('Invalid content hash format');
      score -= 10;
    }

    // Language validation
    if (bundle.lang && !this.isValidLanguageCode(bundle.lang)) {
      errors.push('Invalid language code');
      score -= 5;
    }

    // Blocks validation
    const blocksResult = await this.validateBlocks(bundle.blocks);
    errors.push(...blocksResult.errors);
    warnings.push(...blocksResult.warnings);
    score -= (blocksResult.errors.length * 5);

    // Documents validation
    const docsResult = await this.validateDocuments(bundle.documents);
    errors.push(...docsResult.errors);
    warnings.push(...docsResult.warnings);
    score -= (docsResult.errors.length * 3);

    // Content quality checks
    const qualityResult = await this.validateContentQuality(bundle);
    warnings.push(...qualityResult.warnings);
    score -= (qualityResult.warnings.length * 2);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score)
    };
  }

  /**
   * Validate content blocks
   */
  async validateBlocks(blocks: ContentBlock[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!blocks || blocks.length === 0) {
      warnings.push('No content blocks found');
      return { isValid: true, errors, warnings };
    }

    const blockIds = new Set<string>();
    
    for (const [index, block] of blocks.entries()) {
      // Check required fields
      if (!block.id || !block.type || !block.source_ref) {
        errors.push(`Block ${index}: Missing required fields`);
        continue;
      }

      // Check unique IDs
      if (blockIds.has(block.id)) {
        errors.push(`Block ${index}: Duplicate block ID ${block.id}`);
      }
      blockIds.add(block.id);

      // Check verbatim flag
      if (block.verbatim !== true) {
        errors.push(`Block ${index}: Verbatim flag must be true`);
      }

      // Validate by type
      switch (block.type) {
        case 'heading':
          if (!block.heading_level || !block.heading_text) {
            errors.push(`Block ${index}: Missing heading data`);
          }
          if (block.heading_level && (block.heading_level < 1 || block.heading_level > 6)) {
            errors.push(`Block ${index}: Invalid heading level`);
          }
          break;

        case 'table':
          if (!block.table_columns || !block.table_rows) {
            errors.push(`Block ${index}: Missing table data`);
          }
          if (block.table_columns && block.table_rows) {
            const expectedCols = block.table_columns.length;
            const invalidRows = block.table_rows.filter(row => row.length !== expectedCols);
            if (invalidRows.length > 0) {
              warnings.push(`Block ${index}: Some table rows have mismatched column count`);
            }
          }
          break;

        case 'list':
          if (!block.list_items || block.list_ordered === undefined) {
            errors.push(`Block ${index}: Missing list data`);
          }
          break;

        case 'paragraph':
          if (!block.plain_text || block.plain_text.trim().length === 0) {
            warnings.push(`Block ${index}: Empty paragraph content`);
          }
          break;

        default:
          errors.push(`Block ${index}: Invalid block type ${block.type}`);
      }

      // Check content formats
      if (!block.plain_text && !block.html_content && !block.markdown_content) {
        warnings.push(`Block ${index}: No content in any format`);
      }

      // Validate source reference
      const sourceResult = this.validateSourceReference(block.source_ref);
      if (!sourceResult.isValid) {
        errors.push(`Block ${index}: ${sourceResult.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate scraped documents
   */
  async validateDocuments(documents: ScrapedDocument[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!documents) {
      return { isValid: true, errors, warnings };
    }

    const docHashes = new Set<string>();
    
    for (const [index, doc] of documents.entries()) {
      // Check required fields
      if (!doc.id || !doc.name || !doc.url || !doc.doc_type) {
        errors.push(`Document ${index}: Missing required fields`);
        continue;
      }

      // Check hash if present
      if (doc.content_hash) {
        if (!this.isValidSHA256(doc.content_hash)) {
          errors.push(`Document ${index}: Invalid content hash format`);
        } else if (docHashes.has(doc.content_hash)) {
          warnings.push(`Document ${index}: Duplicate content hash`);
        }
        docHashes.add(doc.content_hash);
      }

      // Check URL format
      if (!this.isValidUrl(doc.url)) {
        errors.push(`Document ${index}: Invalid URL format`);
      }

      // Check document type
      const validTypes = ['pdf', 'docx', 'xlsx', 'pptx', 'other'];
      if (!validTypes.includes(doc.doc_type)) {
        errors.push(`Document ${index}: Invalid document type`);
      }

      // Check size constraints
      if (doc.size_bytes !== undefined) {
        if (doc.size_bytes < 0) {
          errors.push(`Document ${index}: Negative file size`);
        }
        if (doc.size_bytes > 100 * 1024 * 1024) { // 100MB limit
          warnings.push(`Document ${index}: Very large file size`);
        }
      }

      // Check extraction status
      if (doc.extraction_status && !['pending', 'completed', 'failed'].includes(doc.extraction_status)) {
        errors.push(`Document ${index}: Invalid extraction status`);
      }

      // Validate source reference
      const sourceResult = this.validateSourceReference(doc.source_ref);
      if (!sourceResult.isValid) {
        errors.push(`Document ${index}: ${sourceResult.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate source reference
   */
  private validateSourceReference(sourceRef: any): ValidationResult {
    const errors: string[] = [];

    if (!sourceRef || typeof sourceRef !== 'object') {
      errors.push('Invalid source reference');
      return { isValid: false, errors, warnings: [] };
    }

    if (!sourceRef.kind || !['webpage', 'document'].includes(sourceRef.kind)) {
      errors.push('Invalid source reference kind');
    }

    if (sourceRef.kind === 'webpage' && !sourceRef.url) {
      errors.push('Webpage source reference missing URL');
    }

    if (sourceRef.kind === 'document' && !sourceRef.filename) {
      errors.push('Document source reference missing filename');
    }

    if (sourceRef.url && !this.isValidUrl(sourceRef.url)) {
      errors.push('Invalid URL in source reference');
    }

    if (sourceRef.page_number && (typeof sourceRef.page_number !== 'number' || sourceRef.page_number < 1)) {
      errors.push('Invalid page number in source reference');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate content quality
   */
  private async validateContentQuality(bundle: ScrapeBundle): Promise<ValidationResult> {
    const warnings: string[] = [];

    // Check for sufficient content
    const totalTextLength = bundle.blocks.reduce((total, block) => 
      total + (block.plain_text?.length || 0), 0
    );

    if (totalTextLength < 500) {
      warnings.push('Very little text content extracted');
    }

    // Check for tables if expected
    const tableBlocks = bundle.blocks.filter(block => block.type === 'table');
    if (tableBlocks.length === 0 && bundle.documents.length > 0) {
      warnings.push('No tables found despite having documents');
    }

    // Check block type distribution
    const blockTypes = bundle.blocks.map(block => block.type);
    const typeCount = blockTypes.reduce((count, type) => {
      count[type] = (count[type] || 0) + 1;
      return count;
    }, {} as Record<string, number>);

    if (typeCount.paragraph && typeCount.paragraph / blockTypes.length > 0.9) {
      warnings.push('Content is mostly paragraphs, may lack structure');
    }

    // Check for French administrative content (AgriTool specific)
    const allText = bundle.blocks.map(block => block.plain_text || '').join(' ').toLowerCase();
    const adminKeywords = ['subvention', 'aide', 'financement', 'agricole', 'rural', 'exploitation'];
    const keywordCount = adminKeywords.filter(keyword => allText.includes(keyword)).length;
    
    if (keywordCount < 2) {
      warnings.push('Content may not be subsidy-related');
    }

    return {
      isValid: true,
      errors: [],
      warnings
    };
  }

  /**
   * Utility validation methods
   */
  private isValidSHA256(hash: string): boolean {
    return /^[a-f0-9]{64}$/i.test(hash);
  }

  private isValidLanguageCode(lang: string): boolean {
    return /^[a-z]{2}$/i.test(lang);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}