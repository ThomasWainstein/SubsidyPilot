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
    // Extract structured data for AI processing
    const summaryData = {
      core_identification: this.extractCoreInfo(blocks),
      dates: this.consolidateDates(blocks),
      eligibility: this.consolidateEligibility(blocks),
      funding: this.consolidateFunding(blocks),
      procedures: this.consolidateProcedures(blocks),
      contacts: this.consolidateContacts(blocks),
      
      content_overview: {
        total_blocks: blocks.length,
        categories_distribution: this.getContentDistribution(blocks),
        key_information_coverage: this.assessKeyInfoCoverage(blocks),
        content_quality_score: this.calculateOverallQuality(blocks)
      }
    };

    return summaryData;
  }

  private extractCoreInfo(blocks: any[]): any {
    const headingBlocks = blocks.filter(b => b.type === 'heading');
    const contentBlocks = blocks.filter(b => b.category === 'funding' || b.category === 'general');
    
    return {
      title: this.findTitle(headingBlocks),
      authority: this.findAuthority(contentBlocks),
      program: this.findProgram(contentBlocks),
      description: this.findDescription(contentBlocks)
    };
  }

  private async assessContentCompleteness(blocks: any[], fullContent: any): Promise<any> {
    const completeness = {
      information_preservation: {
        original_content_size: fullContent.metadata.total_word_count,
        structured_content_size: blocks.reduce((sum, b) => sum + b.quality_metrics.word_count, 0),
        preservation_ratio: 0
      },
      key_information_coverage: {
        dates_found: blocks.some(b => b.semantic_data.contains_dates?.length > 0),
        amounts_found: blocks.some(b => b.semantic_data.contains_amounts?.length > 0),
        contacts_found: blocks.some(b => b.semantic_data.contains_contacts?.length > 0),
        procedures_found: blocks.some(b => b.semantic_data.contains_procedures?.length > 0)
      },
      content_quality: {
        avg_information_density: this.calculateAvgInformationDensity(blocks),
        french_quality_score: this.calculateAvgFrenchQuality(blocks),
        completeness_score: 0
      }
    };
    
    // Calculate preservation ratio
    completeness.information_preservation.preservation_ratio = 
      completeness.information_preservation.structured_content_size / 
      completeness.information_preservation.original_content_size;
    
    return completeness;
  }

  // Additional helper methods...
  private extractSectionTitle(content: string): string {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    return lines[0]?.substring(0, 100) || 'Untitled Section';
  }

  private calculateInformationDensity(content: string): number {
    const words = this.countWords(content);
    const keyInfo = (content.match(/\d+[%€]|\d{1,2}\/\d{1,2}\/\d{4}|@\w+/g) || []).length;
    return words > 0 ? keyInfo / words : 0;
  }

  private findTitle(headingBlocks: any[]): string {
    return headingBlocks.find(b => b.display_properties?.importance > 80)?.plain_text || 'Unknown Title';
  }

  private findAuthority(blocks: any[]): string {
    const authorityPattern = /franceagrimer|ministère|préfecture|région|département/gi;
    for (const block of blocks) {
      const match = block.plain_text.match(authorityPattern);
      if (match) return match[0];
    }
    return 'Unknown Authority';
  }

  private calculateAvgInformationDensity(blocks: any[]): number {
    const densities = blocks.map(b => b.quality_metrics?.information_density || 0);
    return densities.reduce((sum, d) => sum + d, 0) / densities.length;
  }

  // ... Additional helper methods for completeness
  private isSummaryEligible(content: string, type: string): boolean {
    return type !== 'navigation' && content.length > 20;
  }

  private shouldPreserveFormatting(type: string): boolean {
    return ['table', 'list', 'procedure'].includes(type);
  }

  private calculateHighlightPriority(semanticData: any): number {
    let priority = 0;
    if (semanticData.contains_dates?.length > 0) priority += 30;
    if (semanticData.contains_amounts?.length > 0) priority += 25;
    if (semanticData.contains_contacts?.length > 0) priority += 20;
    return Math.min(priority, 100);
  }

  private calculateContentImportance(content: string, semanticData: any): number {
    let score = 0;
    score += Math.min(content.length / 50, 20); // Length factor
    score += (semanticData.contains_dates?.length || 0) * 15;
    score += (semanticData.contains_amounts?.length || 0) * 10;
    score += (semanticData.contains_contacts?.length || 0) * 12;
    return Math.min(score, 100);
  }

  private convertToMarkdown(content: string, type: string): string {
    switch (type) {
      case 'heading':
        return `# ${content}`;
      case 'list':
        return content.split('\n').map(line => `- ${line.trim()}`).join('\n');
      case 'table':
        return `\`\`\`\n${content}\n\`\`\``;
      default:
        return content;
    }
  }

  private extractKeyTerms(content: string): string[] {
    const keyTerms = content.match(/\b(?:aide|subvention|éligibilité|procédure|montant|date|délai|contact|téléphone|email)\b/gi) || [];
    return [...new Set(keyTerms)];
  }

  private extractDeadlines(content: string): string[] {
    const deadlinePatterns = [
      /date limite[^.]*\d{1,2}\/\d{1,2}\/\d{4}/gi,
      /avant le\s+\d{1,2}\/\d{1,2}\/\d{4}/gi,
      /échéance[^.]*\d{1,2}\/\d{1,2}\/\d{4}/gi
    ];
    
    const deadlines: string[] = [];
    for (const pattern of deadlinePatterns) {
      const matches = content.match(pattern) || [];
      deadlines.push(...matches);
    }
    return deadlines;
  }

  private extractActionItems(content: string): string[] {
    const actionPatterns = [
      /(?:il faut|vous devez|il est nécessaire)[^.]+/gi,
      /(?:déposer|soumettre|envoyer|transmettre)[^.]+/gi,
      /(?:remplir|compléter|joindre)[^.]+/gi
    ];
    
    const actions: string[] = [];
    for (const pattern of actionPatterns) {
      const matches = content.match(pattern) || [];
      actions.push(...matches);
    }
    return actions;
  }

  private extractEligibilityCriteria(content: string): string[] {
    const eligibilityPatterns = [
      /(?:condition|critère|exigence)[^.]+/gi,
      /(?:être|avoir|posséder)[^.]*(?:éligible|bénéficiaire)/gi
    ];
    
    const criteria: string[] = [];
    for (const pattern of eligibilityPatterns) {
      const matches = content.match(pattern) || [];
      criteria.push(...matches);
    }
    return criteria;
  }

  private assessFrenchQuality(content: string): number {
    const frenchWords = content.match(/\b(?:aide|subvention|éligibilité|procédure|montant|euros?|bénéficiaire|demande|dépôt)\b/gi) || [];
    const totalWords = this.countWords(content);
    return totalWords > 0 ? frenchWords.length / totalWords : 0;
  }

  private assessContentCompleteness(content: string): number {
    let score = 0;
    if (content.includes('date')) score += 20;
    if (content.includes('montant') || content.includes('%') || content.includes('€')) score += 25;
    if (content.includes('contact') || content.includes('@')) score += 15;
    if (content.includes('procédure')) score += 20;
    if (content.includes('éligib')) score += 20;
    return Math.min(score, 100);
  }

  private estimateReadingTime(text: string): number {
    const wordsPerMinute = 200; // Average French reading speed
    return Math.ceil(this.countWords(text) / wordsPerMinute);
  }

  private categorizeAllContent(text: string): string[] {
    const categories = [];
    if (text.includes('aide') || text.includes('subvention')) categories.push('funding');
    if (text.includes('éligib')) categories.push('eligibility');
    if (text.includes('procédure')) categories.push('procedure');
    if (text.includes('date')) categories.push('temporal');
    if (text.includes('contact')) categories.push('contact');
    return categories;
  }

  private calculateKeyInfoDensity(text: string): number {
    const keyInfoPatterns = [
      /\d+[%€]/g,
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      /(?:\+33|0)[1-9](?:[.\s-]?\d{2}){4}/g
    ];
    
    let keyInfoCount = 0;
    for (const pattern of keyInfoPatterns) {
      keyInfoCount += (text.match(pattern) || []).length;
    }
    
    return this.countWords(text) > 0 ? keyInfoCount / this.countWords(text) : 0;
  }

  private assessFrenchContentQuality(text: string): number {
    const frenchIndicators = [
      'france', 'français', 'ministre', 'préfet', 'région', 'département',
      'aide', 'subvention', 'éligibilité', 'procédure', 'demande'
    ];
    
    const indicatorCount = frenchIndicators.filter(indicator => 
      text.toLowerCase().includes(indicator)
    ).length;
    
    return (indicatorCount / frenchIndicators.length) * 100;
  }

  private consolidateDates(blocks: any[]): any {
    const allDates = blocks.flatMap(b => b.semantic_data?.contains_dates || []);
    return {
      all_dates: [...new Set(allDates)],
      deadline_dates: allDates.filter(date => 
        blocks.some(b => b.plain_text.toLowerCase().includes('limite') && b.plain_text.includes(date))
      ),
      opening_dates: allDates.filter(date => 
        blocks.some(b => b.plain_text.toLowerCase().includes('ouverture') && b.plain_text.includes(date))
      )
    };
  }

  private consolidateEligibility(blocks: any[]): any {
    const eligibilityBlocks = blocks.filter(b => b.category === 'eligibility');
    return {
      criteria: eligibilityBlocks.flatMap(b => b.semantic_data?.contains_eligibility || []),
      full_text: eligibilityBlocks.map(b => b.plain_text).join('\n')
    };
  }

  private consolidateFunding(blocks: any[]): any {
    const fundingBlocks = blocks.filter(b => b.category === 'funding');
    return {
      amounts: fundingBlocks.flatMap(b => b.semantic_data?.contains_amounts || []),
      full_text: fundingBlocks.map(b => b.plain_text).join('\n')
    };
  }

  private consolidateProcedures(blocks: any[]): any {
    const procedureBlocks = blocks.filter(b => b.category === 'procedure');
    return {
      steps: procedureBlocks.flatMap(b => b.semantic_data?.action_items || []),
      full_text: procedureBlocks.map(b => b.plain_text).join('\n')
    };
  }

  private consolidateContacts(blocks: any[]): any {
    const contactBlocks = blocks.filter(b => b.category === 'contact');
    return {
      contact_info: contactBlocks.flatMap(b => b.semantic_data?.contains_contacts || []),
      full_text: contactBlocks.map(b => b.plain_text).join('\n')
    };
  }

  private getContentDistribution(blocks: any[]): any {
    const distribution: Record<string, number> = {};
    for (const block of blocks) {
      distribution[block.category] = (distribution[block.category] || 0) + 1;
    }
    return distribution;
  }

  private assessKeyInfoCoverage(blocks: any[]): any {
    return {
      has_dates: blocks.some(b => b.semantic_data?.contains_dates?.length > 0),
      has_amounts: blocks.some(b => b.semantic_data?.contains_amounts?.length > 0),
      has_contacts: blocks.some(b => b.semantic_data?.contains_contacts?.length > 0),
      has_procedures: blocks.some(b => b.semantic_data?.contains_procedures?.length > 0),
      has_eligibility: blocks.some(b => b.category === 'eligibility'),
      coverage_score: this.calculateCoverageScore(blocks)
    };
  }

  private calculateCoverageScore(blocks: any[]): number {
    const requiredCategories = ['funding', 'eligibility', 'procedure', 'temporal', 'contact'];
    const foundCategories = [...new Set(blocks.map(b => b.category))];
    const coverage = foundCategories.filter(cat => requiredCategories.includes(cat)).length;
    return (coverage / requiredCategories.length) * 100;
  }

  private calculateOverallQuality(blocks: any[]): number {
    const qualityScores = blocks.map(b => b.quality_metrics?.completeness || 0);
    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  private calculateAvgFrenchQuality(blocks: any[]): number {
    const frenchScores = blocks.map(b => b.quality_metrics?.french_quality || 0);
    return frenchScores.reduce((sum, score) => sum + score, 0) / frenchScores.length;
  }

  private findProgram(blocks: any[]): string {
    const programPattern = /(?:programme|dispositif|mesure|appel à projet)/gi;
    for (const block of blocks) {
      const match = block.plain_text.match(programPattern);
      if (match) {
        const sentence = block.plain_text.split('.').find(s => s.includes(match[0]));
        return sentence?.trim() || match[0];
      }
    }
    return 'Unknown Program';
  }

  private findDescription(blocks: any[]): string {
    const descriptionBlock = blocks.find(b => 
      b.type === 'paragraph' && 
      b.quality_metrics?.word_count > 30 &&
      b.category === 'general'
    );
    return descriptionBlock?.plain_text.substring(0, 200) + '...' || 'No description available';
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