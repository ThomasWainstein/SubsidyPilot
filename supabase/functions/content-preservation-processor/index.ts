import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhancedBundle {
  // For your website - complete preservation
  display_content: {
    complete_html: string;
    readable_text: string;
    structured_sections: any[];
    metadata: any;
  };
  
  // For search/filtering - structured blocks
  content_blocks: any[];
  
  // For AI summaries - concentrated data
  ai_summary: any;
  
  // Quality metrics
  content_completeness: any;
}

class ContentPreservationProcessor {
  
  async processForDualOutput(html: string, sourceUrl: string): Promise<EnhancedBundle> {
    console.log(`🔄 Processing dual output for: ${sourceUrl}`);
    
    // Layer 1: Complete content preservation (ZERO information loss)
    const fullContent = await this.preserveCompleteContent(html, sourceUrl);
    
    // Layer 2: Structured content blocks with semantic metadata
    const structuredBlocks = await this.createEnhancedStructuredBlocks(html, sourceUrl);
    
    // Layer 3: AI-ready summary data
    const aiSummary = await this.extractSummaryData(structuredBlocks);
    
    // Layer 4: Quality assessment
    const completeness = await this.assessContentCompleteness(structuredBlocks, fullContent);
    
    return {
      display_content: fullContent,
      content_blocks: structuredBlocks,
      ai_summary: aiSummary,
      content_completeness: completeness
    };
  }

  private async preserveCompleteContent(html: string, sourceUrl: string) {
    // MINIMAL cleaning - only remove script/style but preserve everything else
    const minimalClean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Create readable text with FULL formatting preservation
    const readableText = this.createReadableTextPreservingAll(minimalClean);
    
    // Identify all content sections WITHOUT removing any
    const sections = this.identifyAllContentSections(minimalClean);
    
    return {
      complete_html: minimalClean, // Minimal cleaning only
      readable_text: readableText, // Formatted for human reading
      structured_sections: sections.map(section => ({
        type: section.type,
        title: section.title,
        content: section.content,
        html: section.html,
        importance: this.calculateSectionImportance(section),
        semantic_category: this.categorizeContent(section.content),
        word_count: this.countWords(section.content),
        contains_key_info: this.detectKeyInformation(section.content)
      })),
      metadata: {
        total_word_count: this.countWords(readableText),
        estimated_reading_time: this.estimateReadingTime(readableText),
        content_categories: this.categorizeAllContent(readableText),
        key_information_density: this.calculateKeyInfoDensity(readableText),
        french_content_quality: this.assessFrenchContentQuality(readableText)
      }
    };
  }

  private createReadableTextPreservingAll(html: string): string {
    let text = html;
    
    // Convert HTML structure to readable format WITHOUT losing content
    
    // 1. Preserve headings with clear markers
    text = text.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (match, level, content) => {
      const cleanContent = this.cleanTextPreserving(content);
      const marker = '='.repeat(parseInt(level));
      return `\n\n${marker} ${cleanContent} ${marker}\n`;
    });
    
    // 2. Preserve paragraphs with line breaks
    text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, (match, content) => {
      const cleanContent = this.cleanTextPreserving(content);
      return cleanContent ? `\n${cleanContent}\n` : '';
    });
    
    // 3. Preserve lists with proper formatting
    text = text.replace(/<ul[^>]*>(.*?)<\/ul>/gi, (match, content) => {
      const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1');
      return `\n${this.cleanTextPreserving(items)}\n`;
    });
    
    text = text.replace(/<ol[^>]*>(.*?)<\/ol>/gi, (match, content) => {
      let counter = 1;
      const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1`);
      return `\n${this.cleanTextPreserving(items)}\n`;
    });
    
    // 4. Preserve tables with ASCII formatting
    text = text.replace(/<table[^>]*>(.*?)<\/table>/gi, (match, tableContent) => {
      return this.convertTableToReadableFormat(tableContent);
    });
    
    // 5. Preserve divs and sections with content
    text = text.replace(/<(div|section|article)[^>]*>(.*?)<\/\1>/gi, (match, tag, content) => {
      const cleanContent = this.cleanTextPreserving(content);
      return cleanContent.length > 20 ? `\n${cleanContent}\n` : cleanContent;
    });
    
    // 6. Clean remaining HTML but preserve text
    text = text.replace(/<[^>]*>/g, ' ');
    
    // 7. Restore French text formatting
    text = this.restoreFrenchFormatting(text);
    
    // 8. Clean up excessive whitespace but preserve structure
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 line breaks
    text = text.replace(/[ \t]+/g, ' '); // Normalize spaces but preserve line breaks
    
    return text.trim();
  }

  private cleanTextPreserving(html: string): string {
    let text = html.replace(/<[^>]*>/g, ' ');
    
    // Comprehensive French character preservation
    const frenchEntities: Record<string, string> = {
      nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
      eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë',
      agrave: 'à', aacute: 'á', acirc: 'â', auml: 'ä',
      igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
      ograve: 'ò', oacute: 'ó', ocirc: 'ô', ouml: 'ö',
      ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
      ccedil: 'ç', ntilde: 'ñ', rsquo: "'", lsquo: "'",
      rdquo: '"', ldquo: '"', laquo: '«', raquo: '»',
      euro: '€', hellip: '…', mdash: '—', ndash: '–'
    };
    
    // Decode numeric entities
    text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
    
    // Decode named entities
    text = text.replace(/&([a-zA-Z]+);/g, (match, entity) => {
      return frenchEntities[entity.toLowerCase()] || match;
    });
    
    return text.replace(/\s+/g, ' ').trim();
  }

  private restoreFrenchFormatting(text: string): string {
    // Fix French punctuation spacing
    text = text.replace(/\s+([,.:;!?])/g, '$1');
    text = text.replace(/([,.:;!?])\s+/g, '$1 ');
    
    // French quotes formatting
    text = text.replace(/\s*«\s*/g, ' « ');
    text = text.replace(/\s*»\s*/g, ' » ');
    
    // Preserve French administrative formatting
    text = text.replace(/(\d+)\s*€/g, '$1 €');
    text = text.replace(/(\d+)\s*%/g, '$1 %');
    
    return text;
  }

  private convertTableToReadableFormat(tableHtml: string): string {
    const rows: string[][] = [];
    
    // Extract table rows
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const cells: string[] = [];
      const cellRegex = /<(th|td)[^>]*>(.*?)<\/\1>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(this.cleanTextPreserving(cellMatch[2]));
      }
      if (cells.length > 0) rows.push(cells);
    }
    
    if (rows.length === 0) return '';
    
    // Calculate column widths
    const colWidths = rows[0].map((_, colIndex) => 
      Math.max(...rows.map(row => (row[colIndex] || '').length))
    );
    
    // Format table
    let table = '\n\n--- TABLE ---\n';
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const formattedRow = row.map((cell, colIndex) => 
        (cell || '').padEnd(colWidths[colIndex])
      ).join(' | ');
      table += `| ${formattedRow} |\n`;
      
      // Add separator after header
      if (i === 0) {
        const separator = colWidths.map(width => '-'.repeat(width)).join('-|-');
        table += `|-${separator}-|\n`;
      }
    }
    table += '--- END TABLE ---\n\n';
    
    return table;
  }

  private identifyAllContentSections(html: string): any[] {
    const sections: any[] = [];
    
    // Identify major content sections without filtering
    const sectionPatterns = [
      { name: 'heading', regex: /<(h[1-6])[^>]*>(.*?)<\/h[1-6]>/gi, type: 'heading' },
      { name: 'navigation', regex: /<nav[^>]*>(.*?)<\/nav>/gi, type: 'navigation' },
      { name: 'main_content', regex: /<main[^>]*>(.*?)<\/main>/gi, type: 'main' },
      { name: 'article', regex: /<article[^>]*>(.*?)<\/article>/gi, type: 'article' },
      { name: 'section', regex: /<section[^>]*>(.*?)<\/section>/gi, type: 'section' },
      { name: 'div_content', regex: /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gi, type: 'content' },
      { name: 'procedure', regex: /procédure|comment|dépôt|demande/gi, type: 'procedure' },
      { name: 'funding', regex: /montant|aide|financement|taux|subvention/gi, type: 'funding' },
      { name: 'eligibility', regex: /éligib|bénéficiaire|condition|critère/gi, type: 'eligibility' },
      { name: 'dates', regex: /date|délai|échéance|\d{1,2}\/\d{1,2}\/\d{4}/gi, type: 'temporal' },
      { name: 'contact', regex: /contact|téléphone|email|@/gi, type: 'contact' }
    ];

    let sectionId = 0;
    for (const pattern of sectionPatterns) {
      let match;
      while ((match = pattern.regex.exec(html)) !== null) {
        const content = this.cleanTextPreserving(match[1] || match[0]);
        if (content.length > 10) { // Very permissive threshold
          sections.push({
            id: `section_${sectionId++}`,
            type: pattern.type,
            title: this.extractSectionTitle(content),
            content: content,
            html: match[0],
            source_pattern: pattern.name,
            word_count: this.countWords(content),
            importance: this.calculateSectionImportance({ content, type: pattern.type })
          });
        }
      }
    }

    return sections;
  }

  private async createEnhancedStructuredBlocks(html: string, sourceUrl: string): Promise<any[]> {
    // Use existing logic but enhance with semantic metadata
    const blocks: any[] = [];
    const cleanedHtml = this.minimalCleanHtml(html);
    let blockIndex = 0;

    // Process all content types with enhanced metadata
    const contentTypes = [
      { type: 'heading', regex: /<(h[1-6])[^>]*>(.*?)<\/h[1-6]>/gi },
      { type: 'paragraph', regex: /<p[^>]*>(.*?)<\/p>/gi },
      { type: 'list', regex: /<(ul|ol)[^>]*>(.*?)<\/\1>/gi },
      { type: 'table', regex: /<table[^>]*>(.*?)<\/table>/gi },
      { type: 'div', regex: /<div[^>]*>(.*?)<\/div>/gi }
    ];

    for (const contentType of contentTypes) {
      let match;
      while ((match = contentType.regex.exec(cleanedHtml)) !== null) {
        const content = this.cleanTextPreserving(match[contentType.type === 'heading' ? 2 : 1] || match[0]);
        if (content.length > 5) { // Very permissive
          
          const semanticData = this.extractSemanticData(content);
          
          const block = {
            id: `block_${blockIndex++}`,
            type: contentType.type,
            category: this.categorizeContent(content),
            
            // Content in multiple formats
            html_content: match[0],
            plain_text: content,
            markdown_content: this.convertToMarkdown(content, contentType.type),
            
            // Enhanced semantic metadata
            semantic_data: semanticData,
            
            // Display control properties
            display_properties: {
              importance: this.calculateContentImportance(content, semanticData),
              summary_eligible: this.isSummaryEligible(content, contentType.type),
              preserve_formatting: this.shouldPreserveFormatting(contentType.type),
              highlight_priority: this.calculateHighlightPriority(semanticData)
            },
            
            // Content quality metrics
            quality_metrics: {
              word_count: this.countWords(content),
              information_density: this.calculateInformationDensity(content),
              french_quality: this.assessFrenchQuality(content),
              completeness: this.assessContentCompleteness(content)
            },
            
            source_ref: {
              kind: 'webpage',
              url: sourceUrl,
              timestamp: new Date().toISOString(),
              extraction_method: 'enhanced_preservation'
            }
          };
          
          blocks.push(block);
        }
      }
    }

    return blocks;
  }

  private extractSemanticData(content: string): any {
    return {
      contains_dates: this.extractDates(content),
      contains_amounts: this.extractAmounts(content),
      contains_contacts: this.extractContacts(content),
      contains_deadlines: this.extractDeadlines(content),
      contains_procedures: this.extractProcedures(content),
      contains_eligibility: this.extractEligibilityCriteria(content),
      action_items: this.extractActionItems(content),
      key_terms: this.extractKeyTerms(content)
    };
  }

  private extractDates(content: string): string[] {
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/gi,
      /(?:début|fin)\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/gi,
      /à partir du\s+\d{1,2}\/\d{1,2}\/\d{4}/gi
    ];
    
    const dates: string[] = [];
    for (const pattern of datePatterns) {
      const matches = content.match(pattern) || [];
      dates.push(...matches);
    }
    return [...new Set(dates)]; // Deduplicate
  }

  private extractAmounts(content: string): string[] {
    const amountPatterns = [
      /\d+(?:\.\d+)?\s*%/g,
      /\d+(?:\s*\d{3})*(?:\.\d+)?\s*€/g,
      /\d+(?:\s*\d{3})*\s*(?:euros?|EUR)/gi,
      /(?:minimum|maximum|jusqu'à|entre)\s+\d+(?:\s*\d{3})*/gi
    ];
    
    const amounts: string[] = [];
    for (const pattern of amountPatterns) {
      const matches = content.match(pattern) || [];
      amounts.push(...matches);
    }
    return [...new Set(amounts)];
  }

  private extractContacts(content: string): string[] {
    const contactPatterns = [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /(?:\+33|0)[1-9](?:[.\s-]?\d{2}){4}/g,
      /(?:contact|information|renseignement).*?(?:téléphone|tél|phone|email)/gi
    ];
    
    const contacts: string[] = [];
    for (const pattern of contactPatterns) {
      const matches = content.match(pattern) || [];
      contacts.push(...matches);
    }
    return [...new Set(contacts)];
  }

  private extractProcedures(content: string): string[] {
    const procedureKeywords = [
      'procédure', 'dépôt', 'demande', 'instruction', 'évaluation',
      'sélection', 'téléservice', 'formulaire', 'pièces justificatives'
    ];
    
    const procedures: string[] = [];
    for (const keyword of procedureKeywords) {
      const regex = new RegExp(`[^.]*${keyword}[^.]*`, 'gi');
      const matches = content.match(regex) || [];
      procedures.push(...matches);
    }
    return procedures;
  }

  private minimalCleanHtml(html: string): string {
    // Only remove script/style, preserve everything else
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateSectionImportance(section: any): number {
    let score = 0;
    const content = section.content.toLowerCase();
    
    // Key section types
    if (section.type === 'heading') score += 10;
    if (section.type === 'main') score += 15;
    if (section.type === 'article') score += 12;
    
    // Important content indicators
    const importantTerms = ['aide', 'subvention', 'éligibilité', 'procédure', 'montant', 'date', 'délai'];
    for (const term of importantTerms) {
      if (content.includes(term)) score += 5;
    }
    
    // Length factor
    score += Math.min(section.word_count / 10, 10);
    
    return Math.min(score, 100);
  }

  private categorizeContent(content: string): string {
    const categories = {
      'funding': ['aide', 'subvention', 'montant', 'financement', 'budget', '%', '€'],
      'eligibility': ['éligib', 'bénéficiaire', 'condition', 'critère', 'exigence'],
      'procedure': ['procédure', 'dépôt', 'demande', 'instruction', 'téléservice'],
      'temporal': ['date', 'délai', 'échéance', 'ouverture', 'fermeture'],
      'contact': ['contact', 'information', 'téléphone', 'email', '@'],
      'legal': ['réglementation', 'décret', 'arrêté', 'loi', 'article'],
      'technical': ['modalité', 'spécification', 'exigence technique']
    };
    
    const contentLower = content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  private async extractSummaryData(blocks: any[]): Promise<any> {
    // Create structured summary from all content blocks
    const summary = {
      core_identification: this.extractCoreInfo(blocks),
      dates: this.extractAllDatesFromBlocks(blocks),
      funding: this.extractFundingInfo(blocks),
      eligibility: this.extractEligibilityInfo(blocks),
      contact: this.extractContactInfo(blocks)
    };

    // Create flexible content sections that preserve ALL text
    const content_sections = this.createFlexibleContentSections(blocks);

    // Extract all attachments/documents
    const attachments = this.extractAllDocuments(blocks);

    return {
      summary,
      content_sections, // This captures EVERYTHING in organized sections
      attachments,
      metadata: {
        total_blocks: blocks.length,
        content_completeness: this.calculateContentCompleteness(blocks),
        processing_method: 'lossless_hybrid'
      }
    };
  }

  private createFlexibleContentSections(blocks: any[]): any[] {
    const sections: any[] = [];
    let currentSection: any = null;
    
    // Group blocks into logical sections based on content
    for (const block of blocks) {
      const sectionType = this.identifySectionType(block);
      
      if (this.isNewSection(block, currentSection)) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          section_name: this.extractSectionName(block),
          section_type: sectionType,
          content_blocks: [block],
          full_text: block.plain_text,
          contains_key_info: block.semantic_data,
          importance_score: block.display_properties?.importance || 0
        };
      } else if (currentSection) {
        // Add to existing section
        currentSection.content_blocks.push(block);
        currentSection.full_text += '\n' + block.plain_text;
        
        // Merge semantic data
        if (block.semantic_data) {
          this.mergeSemanticData(currentSection.contains_key_info, block.semantic_data);
        }
      }
    }
    
    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // Ensure we have all major sections by checking content
    this.ensureAllSectionsCapture(sections, blocks);
    
    return sections;
  }

  private identifySectionType(block: any): string {
    const content = block.plain_text.toLowerCase();
    
    // Standard French subsidy sections
    if (content.includes('présentation') || content.includes('objectif')) return 'presentation';
    if (content.includes('pour qui') || content.includes('bénéficiaire')) return 'beneficiaries';
    if (content.includes('quand') || content.includes('date')) return 'timeline';
    if (content.includes('comment') || content.includes('procédure')) return 'procedure';
    if (content.includes('montant') || content.includes('financement')) return 'funding';
    if (content.includes('éligibilité') || content.includes('condition')) return 'eligibility';
    if (content.includes('document') || content.includes('pièce')) return 'documents';
    if (content.includes('contact') || content.includes('information')) return 'contact';
    
    return block.category || 'content';
  }

  private isNewSection(block: any, currentSection: any): boolean {
    if (!currentSection) return true;
    if (block.type === 'heading') return true;
    
    const blockType = this.identifySectionType(block);
    return blockType !== currentSection.section_type;
  }

  private extractSectionName(block: any): string {
    if (block.type === 'heading') {
      return block.plain_text.trim();
    }
    
    const content = block.plain_text.toLowerCase();
    
    // Extract section names from common patterns
    if (content.includes('présentation')) return 'Présentation';
    if (content.includes('pour qui')) return 'Pour qui ?';
    if (content.includes('quand')) return 'Quand ?';
    if (content.includes('comment')) return 'Comment ?';
    if (content.includes('montant')) return 'Montant de l\'aide';
    if (content.includes('éligibilité')) return 'Éligibilité';
    if (content.includes('procédure')) return 'Procédure';
    if (content.includes('document')) return 'Documents associés';
    if (content.includes('contact')) return 'Contacts et informations';
    
    // Generate name from content type
    return this.generateSectionName(this.identifySectionType(block));
  }

  private generateSectionName(sectionType: string): string {
    const names: Record<string, string> = {
      'presentation': 'Présentation',
      'beneficiaries': 'Bénéficiaires',
      'timeline': 'Calendrier',
      'procedure': 'Procédure',
      'funding': 'Financement',
      'eligibility': 'Éligibilité',
      'documents': 'Documents',
      'contact': 'Contacts',
      'content': 'Informations générales'
    };
    
    return names[sectionType] || 'Contenu';
  }

  private mergeSemanticData(target: any, source: any): void {
    if (!target || !source) return;
    
    // Merge arrays
    const arrayFields = ['contains_dates', 'contains_amounts', 'contains_contacts', 'action_items'];
    for (const field of arrayFields) {
      if (source[field] && Array.isArray(source[field])) {
        target[field] = target[field] || [];
        target[field].push(...source[field]);
        target[field] = [...new Set(target[field])]; // Deduplicate
      }
    }
  }

  private ensureAllSectionsCapture(sections: any[], blocks: any[]): void {
    // Check if any blocks are missed
    const capturedBlockIds = new Set();
    sections.forEach(section => {
      section.content_blocks.forEach((block: any) => capturedBlockIds.add(block.id));
    });
    
    // Add missed blocks to a general section
    const missedBlocks = blocks.filter(block => !capturedBlockIds.has(block.id));
    if (missedBlocks.length > 0) {
      sections.push({
        section_name: 'Informations complémentaires',
        section_type: 'additional',
        content_blocks: missedBlocks,
        full_text: missedBlocks.map(b => b.plain_text).join('\n'),
        contains_key_info: {},
        importance_score: 5
      });
    }
  }

  private extractCoreInfo(blocks: any[]): any {
    const allText = blocks.map(b => b.plain_text).join(' ').toLowerCase();
    
    return {
      title: this.extractTitle(blocks),
      authority: this.extractAuthority(allText),
      sector: this.extractSector(allText),
      status: this.extractStatus(allText),
      call_type: this.extractCallType(allText)
    };
  }

  private extractTitle(blocks: any[]): string {
    // Look for heading blocks first
    const headingBlocks = blocks.filter(b => b.type === 'heading');
    if (headingBlocks.length > 0) {
      return headingBlocks[0].plain_text.replace(/\s*\|\s*FranceAgriMer.*/, '').trim();
    }
    
    // Fallback to first significant content
    const significantBlocks = blocks.filter(b => b.quality_metrics?.word_count > 5);
    if (significantBlocks.length > 0) {
      const firstLine = significantBlocks[0].plain_text.split('\n')[0];
      return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
    }
    
    return 'Aide FranceAgriMer';
  }

  private extractAuthority(text: string): string {
    if (text.includes('franceagrimer')) return 'FranceAgriMer';
    if (text.includes('ministère')) return 'Ministère';
    if (text.includes('préfecture')) return 'Préfecture';
    return 'Non spécifié';
  }

  private extractSector(text: string): string {
    const sectors = {
      'viti': 'Vitivinicole',
      'cidre': 'Cidricole', 
      'agriculture': 'Agriculture',
      'pêche': 'Pêche',
      'élevage': 'Élevage'
    };
    
    for (const [key, value] of Object.entries(sectors)) {
      if (text.includes(key)) return value;
    }
    
    return 'Non spécifié';
  }

  private extractStatus(text: string): string {
    if (text.includes('fermé') || text.includes('clos')) return 'closed';
    if (text.includes('ouvert') || text.includes('disponible')) return 'open';
    return 'unknown';
  }

  private extractCallType(text: string): string {
    if (text.includes('appel à projets')) return 'Appel à projets';
    if (text.includes('aide directe')) return 'Aide directe';
    return 'Non spécifié';
  }

  private extractAllDatesFromBlocks(blocks: any[]): any {
    const allDates: string[] = [];
    blocks.forEach(block => {
      if (block.semantic_data?.contains_dates) {
        allDates.push(...block.semantic_data.contains_dates);
      }
    });
    
    const uniqueDates = [...new Set(allDates)];
    
    return {
      all_dates: uniqueDates,
      deadline: this.findDeadline(uniqueDates),
      opening_date: this.findOpeningDate(uniqueDates),
      closing_date: this.findClosingDate(uniqueDates)
    };
  }

  private extractFundingInfo(blocks: any[]): any {
    const allAmounts: string[] = [];
    blocks.forEach(block => {
      if (block.semantic_data?.contains_amounts) {
        allAmounts.push(...block.semantic_data.contains_amounts);
      }
    });
    
    return {
      amounts_found: [...new Set(allAmounts)],
      funding_rate: allAmounts.find(a => a.includes('%')),
      max_amount: allAmounts.find(a => a.includes('€'))
    };
  }

  private extractEligibilityInfo(blocks: any[]): any {
    const eligibilityBlocks = blocks.filter(b => 
      b.category === 'eligibility' || 
      b.plain_text.toLowerCase().includes('éligib')
    );
    
    return {
      criteria_found: eligibilityBlocks.length > 0,
      full_criteria: eligibilityBlocks.map(b => b.plain_text).join('\n')
    };
  }

  private extractContactInfo(blocks: any[]): any {
    const allContacts: string[] = [];
    blocks.forEach(block => {
      if (block.semantic_data?.contains_contacts) {
        allContacts.push(...block.semantic_data.contains_contacts);
      }
    });
    
    return {
      contacts_found: [...new Set(allContacts)],
      email: allContacts.find(c => c.includes('@')),
      phone: allContacts.find(c => /\d{2}[.\s-]?\d{2}/.test(c))
    };
  }

  private extractAllDocuments(blocks: any[]): any[] {
    const documents: any[] = [];
    
    blocks.forEach(block => {
      if (block.category === 'documents' || block.plain_text.includes('pdf')) {
        // Extract document references from content
        const docMatches = block.plain_text.match(/[\w\s-]+\.pdf/gi) || [];
        docMatches.forEach(match => {
          documents.push({
            name: match.trim(),
            type: 'pdf',
            mentioned_in: block.id,
            content_context: block.plain_text.substring(0, 200)
          });
        });
      }
    });
    
    return documents;
  }

  private findDeadline(dates: string[]): string | null {
    // Look for dates mentioned with deadline context
    return dates.find(date => date.includes('tard')) || dates[0] || null;
  }

  private findOpeningDate(dates: string[]): string | null {
    return dates.find(date => date.includes('partir')) || null;
  }

  private findClosingDate(dates: string[]): string | null {
    return dates.find(date => date.includes('jusqu')) || null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { url, runId } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log(`🔄 Processing content preservation for: ${url}`);

    // Fetch the raw content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgriTool-ContentPreserver/1.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Process with preservation processor
    const processor = new ContentPreservationProcessor();
    const enhancedBundle = await processor.processForDualOutput(html, url);

    // Store the enhanced bundle
    const bundleData = {
      id: crypto.randomUUID(),
      source: { kind: 'webpage', url, timestamp: new Date().toISOString() },
      lang: 'fr',
      content_hash: '',
      last_modified: new Date().toISOString(),
      
      // All three layers of content
      display_content: enhancedBundle.display_content,
      structured_blocks: enhancedBundle.content_blocks,
      ai_summary: enhancedBundle.ai_summary,
      content_completeness: enhancedBundle.content_completeness,
      
      metadata: {
        processor_version: '2.0.0',
        processing_method: 'dual_output_preservation',
        run_id: runId,
        preservation_quality: enhancedBundle.content_completeness.content_quality.completeness_score
      }
    };

    // Save to database
    const { error: bundleError } = await supabase
      .from('scrape_bundles')
      .insert({
        ...bundleData,
        content_data: bundleData
      });

    if (bundleError) {
      console.error('Error saving bundle:', bundleError);
      throw bundleError;
    }

    return new Response(JSON.stringify({
      success: true,
      bundle_id: bundleData.id,
      preservation_stats: {
        original_size: enhancedBundle.display_content.metadata.total_word_count,
        blocks_created: enhancedBundle.content_blocks.length,
        preservation_ratio: enhancedBundle.content_completeness.information_preservation.preservation_ratio,
        quality_score: enhancedBundle.content_completeness.content_quality.completeness_score
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Content preservation error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});