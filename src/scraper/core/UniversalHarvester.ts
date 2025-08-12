/**
 * Universal Content Harvester for AgriTool Enhanced Scraper System
 * 
 * Core class for verbatim content extraction with format preservation.
 * Maintains structure through ordered blocks with exact HTML/text preservation.
 */

import { ContentProcessor } from './ContentProcessor';
import { FormatPreserver } from './FormatPreserver';
import { DocumentExtractor } from './DocumentExtractor';
import { ValidationEngine } from './ValidationEngine';
import { 
  ScrapeBundle, 
  ContentBlock, 
  ScrapedDocument, 
  SourceReference,
  HarvestConfig 
} from '../types/scraper.types';

export class UniversalHarvester {
  private contentProcessor: ContentProcessor;
  private formatPreserver: FormatPreserver;
  private documentExtractor: DocumentExtractor;
  private validator: ValidationEngine;
  private config: HarvestConfig;

  constructor(config: HarvestConfig = {}) {
    this.config = {
      preserveFormatting: true,
      extractTables: true,
      extractDocuments: true,
      verbatimOnly: true,
      maxRetries: 3,
      timeout: 30000,
      ...config
    };

    this.contentProcessor = new ContentProcessor(this.config);
    this.formatPreserver = new FormatPreserver(this.config);
    this.documentExtractor = new DocumentExtractor(this.config);
    this.validator = new ValidationEngine(this.config);
  }

  /**
   * Main entry point for harvesting content from a URL
   */
  async harvestContent(url: string, options: {
    runId?: string;
    sessionId?: string;
    forceRefresh?: boolean;
  } = {}): Promise<ScrapeBundle> {
    console.log(`🌾 Starting harvest for: ${url}`);
    
    try {
      // Check for existing content by URL hash
      if (!options.forceRefresh) {
        const existing = await this.checkExistingContent(url);
        if (existing) {
          console.log(`✅ Found existing content for ${url}`);
          return existing;
        }
      }

      // Fetch raw page content
      const rawContent = await this.fetchRawContent(url);
      
      // Process into structured blocks
      const blocks = await this.processIntoBlocks(rawContent, url);
      
      // Extract linked documents
      const documents = await this.extractLinkedDocuments(rawContent, url);
      
      // Create source reference
      const sourceRef: SourceReference = {
        kind: 'webpage',
        url: url,
        timestamp: new Date().toISOString()
      };

      // Build scrape bundle
      const bundle: ScrapeBundle = {
        id: crypto.randomUUID(),
        source: sourceRef,
        lang: await this.detectLanguage(rawContent),
        content_hash: await this.computeContentHash(blocks, documents),
        last_modified: new Date().toISOString(),
        blocks: blocks,
        documents: documents,
        metadata: {
          harvester_version: '1.0.0',
          harvest_timestamp: new Date().toISOString(),
          run_id: options.runId,
          session_id: options.sessionId,
          url_normalized: this.normalizeUrl(url)
        }
      };

      // Validate bundle structure
      const validation = await this.validator.validateBundle(bundle);
      if (!validation.isValid) {
        console.warn(`⚠️ Bundle validation failed: ${validation.errors.join(', ')}`);
      }

      console.log(`✅ Harvested ${blocks.length} blocks and ${documents.length} documents`);
      return bundle;

    } catch (error) {
      console.error(`❌ Harvest failed for ${url}:`, error);
      throw new Error(`Failed to harvest content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multiple URLs in batch
   */
  async harvestBatch(urls: string[], options: {
    runId?: string;
    batchSize?: number;
    delayMs?: number;
  } = {}): Promise<ScrapeBundle[]> {
    const { batchSize = 5, delayMs = 1000 } = options;
    const results: ScrapeBundle[] = [];
    
    console.log(`🌾 Starting batch harvest of ${urls.length} URLs`);
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(url => 
        this.harvestContent(url, { runId: options.runId })
          .catch(error => {
            console.error(`Failed to harvest ${url}:`, error);
            return null;
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as ScrapeBundle[]);
      
      // Rate limiting delay
      if (i + batchSize < urls.length && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.log(`✅ Batch harvest completed: ${results.length}/${urls.length} successful`);
    return results;
  }

  /**
   * Fetch raw HTML content from URL
   */
  private async fetchRawContent(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgriTool-Harvester/1.0.0 (+https://agritool.eu/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal: AbortSignal.timeout(this.config.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      throw new Error('Empty or too short content received');
    }

    return html;
  }

  /**
   * Process raw HTML into structured content blocks
   */
  private async processIntoBlocks(html: string, sourceUrl: string): Promise<ContentBlock[]> {
    // Clean and parse HTML
    const cleanedHtml = await this.contentProcessor.cleanHtml(html);
    const dom = new DOMParser().parseFromString(cleanedHtml, 'text/html');
    
    const blocks: ContentBlock[] = [];
    
    // Process main content area
    const contentSelectors = [
      'main',
      'article', 
      '.content',
      '.main-content',
      '#content',
      '.entry-content',
      '.post-content'
    ];
    
    let contentContainer = null;
    for (const selector of contentSelectors) {
      contentContainer = dom.querySelector(selector);
      if (contentContainer) break;
    }
    
    // Fallback to body if no content container found
    if (!contentContainer) {
      contentContainer = dom.body;
    }
    
    if (!contentContainer) {
      throw new Error('No content container found in HTML');
    }

    // Extract blocks in document order
    const walker = document.createTreeWalker(
      contentContainer,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const element = node as Element;
          const tagName = element.tagName.toLowerCase();
          
          // Skip script, style, nav, header, footer
          if (['script', 'style', 'nav', 'header', 'footer', 'aside'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          // Accept content elements
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'ul', 'ol', 'table'].includes(tagName)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let blockIndex = 0;
    let node;
    
    while (node = walker.nextNode()) {
      const element = node as Element;
      const block = await this.elementToBlock(element, blockIndex++, sourceUrl);
      
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  /**
   * Convert DOM element to content block
   */
  private async elementToBlock(
    element: Element, 
    index: number, 
    sourceUrl: string
  ): Promise<ContentBlock | null> {
    const tagName = element.tagName.toLowerCase();
    const blockId = `block_${index}_${tagName}`;
    
    // Source reference for this block
    const sourceRef: SourceReference = {
      kind: 'webpage',
      url: sourceUrl,
      selector: this.generateSelector(element),
      timestamp: new Date().toISOString()
    };

    // Extract content based on element type
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      return this.formatPreserver.createHeadingBlock(blockId, element, sourceRef);
    }
    
    if (tagName === 'table') {
      return this.formatPreserver.createTableBlock(blockId, element, sourceRef);
    }
    
    if (['ul', 'ol'].includes(tagName)) {
      return this.formatPreserver.createListBlock(blockId, element, sourceRef);
    }
    
    if (['p', 'div'].includes(tagName) && element.textContent?.trim()) {
      return this.formatPreserver.createParagraphBlock(blockId, element, sourceRef);
    }

    return null;
  }

  /**
   * Extract linked documents from HTML
   */
  private async extractLinkedDocuments(html: string, baseUrl: string): Promise<ScrapedDocument[]> {
    if (!this.config.extractDocuments) {
      return [];
    }

    const dom = new DOMParser().parseFromString(html, 'text/html');
    const links = Array.from(dom.querySelectorAll('a[href]'));
    const documents: ScrapedDocument[] = [];

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;

      const absoluteUrl = new URL(href, baseUrl).toString();
      const docType = this.getDocumentType(absoluteUrl);
      
      if (docType && docType !== 'other') {
        const doc: ScrapedDocument = {
          id: crypto.randomUUID(),
          name: link.textContent?.trim() || this.extractFilenameFromUrl(absoluteUrl),
          doc_type: docType,
          url: absoluteUrl,
          content_hash: '', // Will be computed after download
          source_ref: {
            kind: 'webpage',
            url: baseUrl,
            selector: this.generateSelector(link),
            timestamp: new Date().toISOString()
          }
        };

        documents.push(doc);
      }
    }

    return documents;
  }

  /**
   * Utility methods
   */
  private async checkExistingContent(url: string): Promise<ScrapeBundle | null> {
    // This would check the database for existing content by URL hash
    // Implementation depends on database layer
    return null;
  }

  private async detectLanguage(html: string): Promise<string> {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const langAttr = dom.documentElement.getAttribute('lang');
    
    if (langAttr) {
      return langAttr.substring(0, 2).toLowerCase();
    }
    
    // Simple heuristic detection
    const text = dom.body?.textContent || '';
    const frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'avec'];
    const frenchCount = frenchWords.reduce((count, word) => 
      count + (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g'))?.length || 0), 0
    );
    
    return frenchCount > 5 ? 'fr' : 'en';
  }

  private async computeContentHash(blocks: ContentBlock[], documents: ScrapedDocument[]): Promise<string> {
    const content = {
      blocks: blocks.map(b => ({ type: b.type, text: b.plain_text })),
      documents: documents.map(d => ({ name: d.name, url: d.url }))
    };
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(content));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.hash = '';
      urlObj.search = '';
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private getDocumentType(url: string): 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'other' | null {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'xlsx': return 'xlsx';
      case 'pptx': return 'pptx';
      case 'doc':
      case 'xls':
      case 'ppt':
        return 'other';
      default: return null;
    }
  }

  private extractFilenameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || 'document';
    } catch {
      return 'document';
    }
  }

  private generateSelector(element: Element): string {
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = current.className.split(' ').filter(Boolean);
        if (classes.length > 0) {
          selector += `.${classes[0]}`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement!;
    }
    
    return path.join(' > ');
  }
}