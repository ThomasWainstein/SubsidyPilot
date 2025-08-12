/**
 * Document Extractor - Downloads and processes linked documents
 */

import { ScrapedDocument, SourceReference, HarvestConfig } from '../types/scraper.types';

export class DocumentExtractor {
  private config: HarvestConfig;

  constructor(config: HarvestConfig) {
    this.config = config;
  }

  /**
   * Process document from URL - download and extract content
   */
  async processDocument(doc: ScrapedDocument): Promise<ScrapedDocument> {
    console.log(`📄 Processing document: ${doc.name}`);
    
    try {
      // Download document content
      const content = await this.downloadDocument(doc.url);
      
      // Compute content hash
      doc.content_hash = await this.computeFileHash(content);
      doc.size_bytes = content.byteLength;
      
      // Extract text based on document type
      switch (doc.doc_type) {
        case 'pdf':
          await this.processPDF(doc, content);
          break;
        case 'docx':
          await this.processDOCX(doc, content);
          break;
        case 'xlsx':
          await this.processXLSX(doc, content);
          break;
        default:
          doc.extraction_status = 'completed';
          doc.extraction_metadata = { note: 'Binary document, no text extraction' };
      }
      
      console.log(`✅ Document processed: ${doc.name} (${doc.extraction_status})`);
      return doc;
      
    } catch (error) {
      console.error(`❌ Failed to process document ${doc.name}:`, error);
      doc.extraction_status = 'failed';
      doc.extraction_metadata = { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      return doc;
    }
  }

  /**
   * Download document content as ArrayBuffer
   */
  private async downloadDocument(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgriTool-Harvester/1.0.0 (+https://agritool.eu/bot)',
        'Accept': 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,*/*'
      },
      signal: AbortSignal.timeout(this.config.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    console.log(`📥 Downloaded ${url} (${contentType}, ${response.headers.get('content-length')} bytes)`);

    return await response.arrayBuffer();
  }

  /**
   * Process PDF document
   */
  private async processPDF(doc: ScrapedDocument, content: ArrayBuffer): Promise<void> {
    // For now, mark as completed - actual PDF processing would require pdf-parse or similar
    doc.extraction_status = 'completed';
    doc.extraction_metadata = {
      method: 'placeholder',
      note: 'PDF text extraction not yet implemented',
      size_bytes: content.byteLength,
      timestamp: new Date().toISOString()
    };
    
    // TODO: Implement actual PDF text extraction
    // const pdfText = await this.extractPDFText(content);
    // doc.extracted_text = pdfText;
    // doc.tables_extracted = await this.extractPDFTables(content);
  }

  /**
   * Process DOCX document
   */
  private async processDOCX(doc: ScrapedDocument, content: ArrayBuffer): Promise<void> {
    // For now, mark as completed - actual DOCX processing would require mammoth or similar
    doc.extraction_status = 'completed';
    doc.extraction_metadata = {
      method: 'placeholder',
      note: 'DOCX text extraction not yet implemented',
      size_bytes: content.byteLength,
      timestamp: new Date().toISOString()
    };
    
    // TODO: Implement actual DOCX text extraction
    // const docxText = await this.extractDOCXText(content);
    // doc.extracted_text = docxText;
    // doc.tables_extracted = await this.extractDOCXTables(content);
  }

  /**
   * Process XLSX document
   */
  private async processXLSX(doc: ScrapedDocument, content: ArrayBuffer): Promise<void> {
    // For now, mark as completed - actual XLSX processing would require xlsx library
    doc.extraction_status = 'completed';
    doc.extraction_metadata = {
      method: 'placeholder',
      note: 'XLSX processing not yet implemented',
      size_bytes: content.byteLength,
      timestamp: new Date().toISOString()
    };
    
    // TODO: Implement actual XLSX processing
    // const workbook = await this.parseXLSX(content);
    // doc.tables_extracted = await this.extractXLSXTables(workbook);
  }

  /**
   * Compute SHA256 hash of file content
   */
  private async computeFileHash(content: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', content);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Detect document language from extracted text
   */
  private detectDocumentLanguage(text: string): string {
    if (!text || text.length < 100) {
      return 'unknown';
    }
    
    // Simple French detection
    const frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'avec', 'dans', 'pour', 'sur'];
    const lowerText = text.toLowerCase();
    const frenchCount = frenchWords.reduce((count, word) => 
      count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g'))?.length || 0), 0
    );
    
    // If we find many French words, it's likely French
    if (frenchCount > text.split(' ').length * 0.05) {
      return 'fr';
    }
    
    return 'en'; // Default to English
  }

  /**
   * Estimate number of pages from content size (rough heuristic)
   */
  private estimatePages(sizeBytes: number, docType: string): number {
    // Very rough estimates
    switch (docType) {
      case 'pdf':
        return Math.max(1, Math.round(sizeBytes / 50000)); // ~50KB per page
      case 'docx':
        return Math.max(1, Math.round(sizeBytes / 30000)); // ~30KB per page
      default:
        return 1;
    }
  }

  /**
   * Validate document content and structure
   */
  private validateDocument(doc: ScrapedDocument): boolean {
    // Basic validation
    if (!doc.content_hash || doc.content_hash.length !== 64) {
      return false;
    }
    
    if (!doc.size_bytes || doc.size_bytes <= 0) {
      return false;
    }
    
    if (!doc.url || !doc.name) {
      return false;
    }
    
    return true;
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanExtractedText(text: string): string {
    if (!text) return '';
    
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Remove page numbers and headers/footers (basic patterns)
    cleaned = cleaned.replace(/\bPage \d+\b/gi, '');
    cleaned = cleaned.replace(/^\d+\s*$/gm, ''); // Lines with only numbers
    
    // Normalize line breaks
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\r/g, '\n');
    
    // Remove multiple consecutive line breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
  }
}