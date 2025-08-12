// index.ts — Enhanced universal scraper with pagination-based discovery for
// FranceAgriMer and Les-Aides listing pages.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapeBundle {
  id: string;
  source: { kind: 'webpage'; url: string; timestamp: string; };
  lang: string;
  content_hash: string;
  last_modified: string;
  blocks: any[];
  documents: any[];
  metadata?: any;
}

/* ----------------------------- HARVESTER CORE ----------------------------- */

class UniversalHarvester {
  private timeout: number = 30000;

  async harvestContent(url: string, options: { runId?: string } = {}): Promise<ScrapeBundle> {
    console.log(`🌾 Starting harvest for: ${url}`);
    try {
      const html = await this.fetchRawContent(url);
      const blocks = await this.processIntoBlocks(html, url);
      const documents = await this.extractLinkedDocuments(html, url);

      // Try to get additional content from potential AJAX/tab content
      const additionalBlocks = await this.extractTabContent(html, url);
      
      // Deduplicate blocks to avoid content from both main and tab sections
      const existingTexts = new Set(blocks.map(b => b.plain_text.trim().toLowerCase()));
      const uniqueAdditionalBlocks = additionalBlocks.filter(block => {
        const normalizedText = block.plain_text.trim().toLowerCase();
        return !existingTexts.has(normalizedText);
      });
      
      blocks.push(...uniqueAdditionalBlocks);

      const bundle: ScrapeBundle = {
        id: crypto.randomUUID(),
        source: { kind: 'webpage', url, timestamp: new Date().toISOString() },
        lang: await this.detectLanguage(html),
        content_hash: await this.computeContentHash(blocks, documents),
        last_modified: new Date().toISOString(),
        blocks,
        documents,
        metadata: {
          harvester_version: '1.0.0',
          harvest_timestamp: new Date().toISOString(),
          run_id: options.runId,
          url_normalized: this.normalizeUrl(url)
        }
      };
      console.log(`✅ Harvested ${blocks.length} blocks and ${documents.length} documents from ${url}`);
      return bundle;
    } catch (error) {
      console.error(`❌ Harvest failed for ${url}:`, error);
      throw new Error(`Failed to harvest content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchRawContent(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgriTool-Harvester/1.0.0 (+https://agritool.eu/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(this.timeout)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const html = await response.text();
    if (!html || html.length < 100) throw new Error('Empty or too short content received');
    return html;
  }

  private cleanHtml(html: string): string {
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    cleaned = cleaned.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
    cleaned = cleaned.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '');
    cleaned = cleaned.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
    return cleaned;
  }

  private cleanText(html: string): string {
    let text = html.replace(/<[^>]*>/g, '');
    
    // Decode numeric HTML entities
    text = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
    
    // Decode named HTML entities (comprehensive list for French content)
    const entities: Record<string, string> = {
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
    
    text = text.replace(/&([a-zA-Z]+);/g, (match, entity) => {
      return entities[entity.toLowerCase()] || match;
    });
    
    return text.replace(/\s+/g, ' ').trim();
  }

  private restoreTextStructure(rawText: string): string {
    let text = rawText.trim();
    
    // 1. First normalize whitespace 
    text = text.replace(/\s+/g, ' ');
    
    // 2. Fix French punctuation spacing
    text = text.replace(/\s+([,.:;!?])/g, '$1');
    text = text.replace(/([,.:;!?])\s+/g, '$1 ');
    
    // 3. Detect and format numbered/lettered lists (a., b., c. or 1., 2., 3.)
    text = text.replace(/\b([a-z])\.\s+/gi, '\n• $1. ');
    text = text.replace(/\b(\d+)\.\s+/g, '\n• $1. ');
    
    // 4. Smart semicolon handling - only break for lists, not inline text
    // Look for patterns like "; exploitant" or "; être" that indicate list items
    text = text.replace(/;\s*(être|avoir|exploitant|groupement|personne|immatriculé)/gi, ';\n• $1');
    
    // 5. Add section breaks before key subsidy terms
    const sectionMarkers = [
      'Montant de l\'aide',
      'Bénéficiaires éligibles', 
      'Les exploitants agricoles',
      'Instruction et demande',
      'La demande est composée',
      'Le dossier de demande',
      'La demande de paiement',
      'Procédure de dépôt',
      'Procédure',
      'Comment déposer',
      'Modalités de gestion',
      'Appel à proposition',
      'Les objectifs généraux',
      'Conditions d\'éligibilité'
    ];
    
    for (const marker of sectionMarkers) {
      const regex = new RegExp(`\\b(${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
      text = text.replace(regex, `\n\n## $1\n`);
    }
    
    // 6. Clean up excessive bullets and formatting
    text = text.replace(/•\s*•+/g, '•'); // Remove multiple bullets
    text = text.replace(/^\s*•\s*/gm, '• '); // Standardize bullet formatting
    
    // 7. Remove bullets that accidentally split words
    text = text.replace(/(\w)\s*•\s*(\w)/g, '$1$2');
    
    // 8. Basic deduplication - remove identical sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    const uniqueSentences: string[] = [];
    const seen = new Set<string>();
    
    for (const sentence of sentences) {
      const normalized = sentence.trim().toLowerCase();
      if (normalized.length > 20 && !seen.has(normalized)) {
        uniqueSentences.push(sentence);
        seen.add(normalized);
      } else if (normalized.length <= 20) {
        uniqueSentences.push(sentence); // Keep short sentences
      }
    }
    
    return uniqueSentences.join(' ').trim();
  }

  private async processIntoBlocks(html: string, sourceUrl: string): Promise<any[]> {
    const cleanedHtml = this.cleanHtml(html);
    const blocks: any[] = [];
    const seenContent = new Set<string>();
    let idx = 0;

    // Headings
    const headingRegex = /<(h[1-6])[^>]*>(.*?)<\/h[1-6]>/gi; let m;
    while ((m = headingRegex.exec(cleanedHtml)) !== null) {
      const level = parseInt(m[1].substring(1));
      const text = this.cleanText(m[2]);
      if (text && text.length > 2) {
        const contentKey = `heading_${text.toLowerCase().trim()}`;
        if (!seenContent.has(contentKey)) {
          seenContent.add(contentKey);
          blocks.push({
            id: `block_${idx++}_heading`,
            type: 'heading',
            verbatim: true,
            html_content: m[0],
            plain_text: text,
            markdown_content: `${'#'.repeat(level)} ${text}`,
            heading_level: level,
            heading_text: text,
            source_ref: { kind: 'webpage', url: sourceUrl, timestamp: new Date().toISOString() }
          });
        }
      }
    }

    // Paragraphs with improved processing
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
    while ((m = paragraphRegex.exec(cleanedHtml)) !== null) {
      const text = this.cleanText(m[1]);
      if (text.length > 20) {
        const contentKey = text.toLowerCase().trim().substring(0, 100);
        if (!seenContent.has(contentKey)) {
          seenContent.add(contentKey);
          
          // Don't apply aggressive structure restoration to individual paragraphs
          // Just clean and format properly
          const cleanedText = text.replace(/\s+/g, ' ').trim();
          
          blocks.push({
            id: `block_${idx++}_paragraph`,
            type: 'paragraph',
            verbatim: true,
            html_content: m[0],
            plain_text: cleanedText,
            markdown_content: cleanedText,
            source_ref: { kind: 'webpage', url: sourceUrl, timestamp: new Date().toISOString() }
          });
        }
      }
    }

    // Tables
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gi;
    while ((m = tableRegex.exec(cleanedHtml)) !== null) {
      const tableData = this.extractTableData(m[0]);
      if (tableData.columns.length > 0) {
        const tableText = this.tableToPlainText(tableData);
        const contentKey = `table_${tableText.substring(0, 100)}`;
        if (!seenContent.has(contentKey)) {
          seenContent.add(contentKey);
          blocks.push({
            id: `block_${idx++}_table`,
            type: 'table',
            verbatim: true,
            html_content: m[0],
            plain_text: tableText,
            markdown_content: this.tableToMarkdown(tableData),
            table_columns: tableData.columns,
            table_rows: tableData.rows,
            source_ref: { kind: 'webpage', url: sourceUrl, timestamp: new Date().toISOString() }
          });
        }
      }
    }

    // Lists
    const listRegex = /<(ul|ol)[^>]*>(.*?)<\/(ul|ol)>/gi;
    while ((m = listRegex.exec(cleanedHtml)) !== null) {
      const listData = this.extractListData(m[0], m[1] === 'ol');
      if (listData.items.length > 0) {
        const listText = listData.items.join('\n');
        const contentKey = `list_${listText.substring(0, 100)}`;
        if (!seenContent.has(contentKey)) {
          seenContent.add(contentKey);
          blocks.push({
            id: `block_${idx++}_list`,
            type: 'list',
            verbatim: true,
            html_content: m[0],
            plain_text: listText,
            markdown_content: this.listToMarkdown(listData),
            list_ordered: listData.ordered,
            list_items: listData.items,
            source_ref: { kind: 'webpage', url: sourceUrl, timestamp: new Date().toISOString() }
          });
        }
      }
    }

    return blocks;
  }

  private extractTableData(tableHtml: string): { columns: string[], rows: string[][] } {
    const columns: string[] = [];
    const rows: string[][] = [];
    const headerRegex = /<th[^>]*>(.*?)<\/th>/gi; let m;
    while ((m = headerRegex.exec(tableHtml)) !== null) columns.push(this.cleanText(m[1]));
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
    while ((m = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = m[1];
      const cells: string[] = [];
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gi; let c;
      while ((c = cellRegex.exec(rowHtml)) !== null) cells.push(this.cleanText(c[1]));
      if (cells.length > 0) rows.push(cells);
    }
    return { columns, rows };
  }

  private extractListData(listHtml: string, ordered: boolean): { ordered: boolean, items: string[] } {
    const items: string[] = [];
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gi; let m;
    while ((m = itemRegex.exec(listHtml)) !== null) {
      const text = this.cleanText(m[1]);
      if (text) items.push(text);
    }
    return { ordered, items };
  }

  private tableToPlainText(t: { columns: string[], rows: string[][] }): string {
    let s = '';
    if (t.columns.length) s += t.columns.join(' | ') + '\n';
    for (const r of t.rows) s += r.join(' | ') + '\n';
    return s;
  }

  private tableToMarkdown(t: { columns: string[], rows: string[][] }): string {
    if (t.columns.length === 0) return '';
    
    let md = '| ' + t.columns.join(' | ') + ' |\n';
    md += '| ' + t.columns.map(() => '---').join(' | ') + ' |\n';
    
    for (const row of t.rows) {
      md += '| ' + row.join(' | ') + ' |\n';
    }
    
    return md;
  }

  private listToMarkdown(l: { ordered: boolean, items: string[] }): string {
    return l.items.map((item, i) => {
      const marker = l.ordered ? `${i + 1}.` : '-';
      return `${marker} ${item}`;
    }).join('\n');
  }

  private async extractLinkedDocuments(html: string, baseUrl: string): Promise<any[]> {
    const documents: any[] = [];
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi; let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const href = m[1]; const linkText = this.cleanText(m[2]);
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        const docType = this.getDocumentType(absoluteUrl);
        if (docType && docType !== 'other') {
          documents.push({
            id: crypto.randomUUID(),
            name: linkText || this.extractFilenameFromUrl(absoluteUrl),
            doc_type: docType,
            url: absoluteUrl,
            content_hash: '',
            source_ref: { kind: 'webpage', url: baseUrl, timestamp: new Date().toISOString() }
          });
        }
      } catch { /* ignore invalid urls */ }
    }
    return documents;
  }

  private getDocumentType(url: string): 'pdf'|'docx'|'xlsx'|'pptx'|'other'|null {
    const ext = url.split('.').pop()?.toLowerCase();
    switch (ext) { case 'pdf': return 'pdf'; case 'docx': return 'docx';
      case 'xlsx': return 'xlsx'; case 'pptx': return 'pptx';
      case 'doc': case 'xls': case 'ppt': return 'other'; default: return null; }
  }
  private extractFilenameFromUrl(url: string): string {
    try { const p = new URL(url).pathname; return p.split('/').pop() || 'document'; }
    catch { return 'document'; }
  }

  private async detectLanguage(html: string): Promise<string> {
    const text = this.cleanText(html).toLowerCase();
    const fr = ['le','la','les','de','du','des','et','ou','avec','dans','pour','sur'];
    const count = fr.reduce((n,w)=> n + (text.match(new RegExp(`\\b${w}\\b`,'g'))?.length || 0), 0);
    return count > 10 ? 'fr' : 'en';
  }

  private async computeContentHash(blocks: any[], documents: any[]): Promise<string> {
    const content = {
      blocks: blocks.map(b => ({ type: b.type, text: b.plain_text })),
      documents: documents.map(d => ({ name: d.name, url: d.url }))
    };
    const data = new TextEncoder().encode(JSON.stringify(content));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  private isDetailPage(html: string, url: string): boolean {
    // Check if this is a detail page vs category/listing page
    const cleanedHtml = this.cleanHtml(html);
    
    // Count repeated article/aid listings (indicator of category page)
    const aidListingPatterns = [
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<div[^>]*class="[^"]*aid[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      /<h[2-4][^>]*>[\s\S]*?<a[^>]*href="[^"]*\/aides\/[^"]*"[^>]*>/gi
    ];
    
    let listingCount = 0;
    for (const pattern of aidListingPatterns) {
      const matches = cleanedHtml.match(pattern);
      listingCount += matches?.length || 0;
    }
    
    // If more than 3 aid listings detected, likely a category page
    if (listingCount > 3) {
      console.log(`🚫 Skipping category page with ${listingCount} listings: ${url}`);
      return false;
    }
    
    // Check for detail page indicators
    const detailIndicators = [
      /téléprocédure/i,
      /demande d'aide/i,
      /montant de l'aide/i,
      /bénéficiaires/i,
      /critères d'éligibilité/i,
      /date limite/i,
      /comment/i,
      /pour qui/i,
      /quand/i
    ];
    
    const indicatorCount = detailIndicators.reduce((count, pattern) => {
      return count + (pattern.test(cleanedHtml) ? 1 : 0);
    }, 0);
    
    // Check text content length (detail pages have more content)
    const textContent = this.cleanText(cleanedHtml);
    const hasSubstantialContent = textContent.length > 1000;
    
    const isDetail = indicatorCount >= 2 && hasSubstantialContent;
    
    if (!isDetail) {
      console.log(`🚫 Skipping non-detail page (indicators: ${indicatorCount}, length: ${textContent.length}): ${url}`);
    }
    
    return isDetail;
  }

  private normalizeUrl(url: string): string {
    try { const u = new URL(url); u.hash=''; u.search=''; return u.toString(); }
    catch { return url; }
  }

  private async extractTabContent(html: string, sourceUrl: string): Promise<any[]> {
    const blocks: any[] = [];
    let idx = 1000; // Start with high index to avoid conflicts

    // Look for tab content patterns common in FranceAgriMer
    const tabPatterns = [
      /<div[^>]*class="[^"]*tab-content[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<div[^>]*id="[^"]*tab[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<div[^>]*data-tab[^>]*>(.*?)<\/div>/gis,
      // Look for accordion/collapsible content
      /<div[^>]*class="[^"]*collapse[^"]*"[^>]*>(.*?)<\/div>/gis,
      /<details[^>]*>(.*?)<\/details>/gis,
      // Look for hidden content that might be tab content
      /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>(.*?)<\/div>/gis
    ];

    for (const pattern of tabPatterns) {
      let m;
      while ((m = pattern.exec(html)) !== null) {
        const content = m[1];
        if (content && content.length > 50) {
          // Extract paragraphs from tab content
          const paragraphs = content.match(/<p[^>]*>(.*?)<\/p>/gi);
          if (paragraphs) {
            for (const p of paragraphs) {
              const text = this.cleanText(p);
              if (text.length > 20) {
                const structuredText = this.restoreTextStructure(text);
                blocks.push({
                  id: `tab_block_${idx++}_paragraph`,
                  type: 'paragraph',
                  verbatim: true,
                  html_content: p,
                  plain_text: structuredText,
                  markdown_content: structuredText,
                  source_ref: { kind: 'webpage', url: sourceUrl, timestamp: new Date().toISOString() }
                });
              }
            }
          }

          // Extract lists from tab content
          const lists = content.match(/<(ul|ol)[^>]*>(.*?)<\/(ul|ol)>/gi);
          if (lists) {
            for (const list of lists) {
              const listData = this.extractListData(list, list.toLowerCase().includes('<ol'));
              if (listData.items.length > 0) {
                blocks.push({
                  id: `tab_block_${idx++}_list`,
                  type: 'list',
                  verbatim: true,
                  html_content: list,
                  plain_text: listData.items.join('\n'),
                  list_ordered: listData.ordered,
                  list_items: listData.items,
                  source_ref: { kind: 'webpage', url: sourceUrl, timestamp: new Date().toISOString() }
                });
              }
            }
          }
        }
      }
    }

    console.log(`📑 Extracted ${blocks.length} additional blocks from tab/hidden content`);
    return blocks;
  }

  public getMimeTypeFromDocType(docType: string): string {
    switch (docType) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      default: return 'application/octet-stream';
    }
  }
}

/* ------------------------- SITE-SPECIFIC DISCOVERY ------------------------- */

type DiscoveryResult = { site: 'franceagrimer' | 'lesaides'; urls: string[]; pages_scanned: number; };

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtmlWithUA(url: string, timeout = 30000): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AgriTool-Harvester/1.0.0 (+https://agritool.eu/bot)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
    },
    signal: AbortSignal.timeout(timeout)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.text();
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>/gi; let m;
  while ((m = linkRegex.exec(html)) !== null) {
    try { links.push(new URL(m[1], baseUrl).toString()); } catch { /* ignore */ }
  }
  return links;
}

/** FranceAgriMer: start at ?page=0 and increment until no new detail URLs */
async function discoverFranceAgriMer(startUrl = 'https://www.franceagrimer.fr/rechercher-une-aide?page=0', maxPages = 50): Promise<DiscoveryResult> {
  const seen = new Set<string>();
  const detail = new Set<string>();
  let pageNum = 0, scanned = 0, newOnLastPage = 0;

  while (pageNum < maxPages) {
    const url = `https://www.franceagrimer.fr/rechercher-une-aide?page=${pageNum}`;
    console.log(`🔎 [FAM] Listing page ${pageNum}: ${url}`);
    let html: string;
    try { html = await fetchHtmlWithUA(url); }
    catch (e) { console.warn(`⚠️ [FAM] stop at page ${pageNum}: ${e}`); break; }

    const links = extractLinks(html, url);
    let addedThisPage = 0;

    for (const href of links) {
      // Accept detail pages like /aides/<slug>
      if (href.includes('/aides/') && !href.includes('/rechercher-une-aide')) {
        if (!detail.has(href)) { detail.add(href); addedThisPage++; }
      }
    }

    scanned++;
    console.log(`   → found ${addedThisPage} new detail URLs (total ${detail.size})`);
    if (addedThisPage === 0 && newOnLastPage === 0) { console.log('   → no new URLs across two pages, stopping'); break; }
    newOnLastPage = addedThisPage;

    // crude loop‑protection by listing-page content hash
    const pageHash = await sha256(html);
    if (seen.has(pageHash)) { console.log('   → same page content hash detected, stopping'); break; }
    seen.add(pageHash);

    pageNum++;
    await sleep(700); // be nice
  }

  return { site: 'franceagrimer', urls: Array.from(detail), pages_scanned: scanned };
}

/** Les-Aides: start at ?page=1 and increment until no new detail URLs */
async function discoverLesAides(startUrl = 'https://les-aides.fr/aides/?page=1', maxPages = 50): Promise<DiscoveryResult> {
  const seen = new Set<string>();
  const detail = new Set<string>();
  let pageNum = 1, scanned = 0, newOnLastPage = 0;

  while (pageNum < maxPages) {
    const url = `https://les-aides.fr/aides/?page=${pageNum}`;
    console.log(`🔎 [LA] Listing page ${pageNum}: ${url}`);
    let html: string;
    try { html = await fetchHtmlWithUA(url); }
    catch (e) { console.warn(`⚠️ [LA] stop at page ${pageNum}: ${e}`); break; }

    const links = extractLinks(html, url);
    let addedThisPage = 0;

    for (const href of links) {
      // Accept detail pages like /aide/<slug-or-code>.html
      if (new URL(href).pathname.startsWith('/aide/')) {
        if (!detail.has(href)) { detail.add(href); addedThisPage++; }
      }
    }

    scanned++;
    console.log(`   → found ${addedThisPage} new detail URLs (total ${detail.size})`);
    if (addedThisPage === 0 && newOnLastPage === 0) { console.log('   → no new URLs across two pages, stopping'); break; }
    newOnLastPage = addedThisPage;

    const pageHash = await sha256(html);
    if (seen.has(pageHash)) { console.log('   → same page content hash detected, stopping'); break; }
    seen.add(pageHash);

    pageNum++;
    await sleep(700);
  }

  return { site: 'lesaides', urls: Array.from(detail), pages_scanned: scanned };
}

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* --------------------------------- SERVER -------------------------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const {
      sites = ['franceagrimer', 'lesaides'],
      max_listing_pages = 50,       // max pages to paginate per site
      max_detail_urls_per_site = 200, // safety cap
      rate_limit_ms = 1000
    } = body;

    console.log(`🚀 Start discovery+harvest for: ${sites.join(', ')} (max pages/site=${max_listing_pages})`);

    const runId = crypto.randomUUID();
    const { error: runError } = await supabase.from('pipeline_runs').insert({
      id: runId,
      status: 'running',
      stage: 'harvest',
      config: { sites, max_listing_pages, scraper: 'universal_harvester' },
      started_at: new Date().toISOString()
    });
    if (runError) throw new Error(`Failed to create pipeline run: ${runError.message}`);

    const harvester = new UniversalHarvester();
    const results = {
      bundles_created: 0,
      blocks_extracted: 0,
      documents_found: 0,
      sites_processed: [] as any[],
      errors: [] as string[]
    };

    for (const site of sites as Array<'franceagrimer'|'lesaides'>) {
      let discovery: DiscoveryResult;
      if (site === 'franceagrimer') {
        discovery = await discoverFranceAgriMer('https://www.franceagrimer.fr/rechercher-une-aide?page=0', max_listing_pages);
      } else if (site === 'lesaides') {
        discovery = await discoverLesAides('https://les-aides.fr/aides/?page=1', max_listing_pages);
      } else {
        results.errors.push(`Unknown site: ${site}`);
        continue;
      }

      const allUrls = discovery.urls.slice(0, max_detail_urls_per_site);
      console.log(`📄 ${site}: discovered ${allUrls.length} detail URLs over ${discovery.pages_scanned} listing pages`);

      const siteResults = { site, bundles: 0, blocks: 0, documents: 0, urls_processed: [] as string[] };

      for (const url of allUrls) {
        try {
          // Check if this is a detail page before processing
          const html = await harvester['fetchRawContent'](url);
          if (!harvester['isDetailPage'](html, url)) {
            continue; // Skip category/listing pages
          }
          
          const bundle = await harvester.harvestContent(url, { runId });
          
          // Generate proper markdown content
          const markdownContent = bundle.blocks.map(block => {
            if (block.type === 'heading') {
              const hashes = '#'.repeat(block.heading_level || 1);
              return `${hashes} ${block.plain_text}`;
            } else if (block.type === 'list') {
              return block.list_items?.map((item: string) => `- ${item}`).join('\n') || block.plain_text;
            } else if (block.type === 'table') {
              return `**Table:**\n${block.plain_text}`;
            }
            return block.plain_text;
          }).join('\n\n');

          // Combine all content for combined_content_markdown
          const combinedMarkdown = `# ${new URL(url).pathname.split('/').pop()?.replace(/-/g, ' ') || 'Content'}\n\n${markdownContent}`;
          
          // Get document paths
          const attachmentPaths = bundle.documents.map(doc => doc.url);

          const { data: pageData, error: pageError } = await supabase
            .from('raw_scraped_pages')
            .upsert({
              source_url: bundle.source.url,
              source_site: site,
              raw_text: bundle.blocks.map(b => b.plain_text).join('\n'),
              raw_html: bundle.blocks.map(b => b.html_content || '').join('\n'),
              text_markdown: markdownContent,
              raw_markdown: markdownContent,
              combined_content_markdown: combinedMarkdown,
              attachment_paths: attachmentPaths,
              run_id: runId,
              status: 'processed',
              attachment_count: bundle.documents.length,
              scrape_date: new Date().toISOString(),
              sections_jsonb: {
                blocks_count: bundle.blocks.length,
                documents_count: bundle.documents.length,
                content_hash: bundle.content_hash
              },
              attachments_jsonb: bundle.documents
            }, { onConflict: 'source_url' })
            .select('id')
            .single();

          if (pageError) {
            console.error(`Failed to store scraped page for ${url}:`, pageError);
            results.errors.push(`Page storage failed for ${url}: ${pageError.message}`);
          }

          const pageId = pageData?.id;

          // Store individual content blocks
          if (bundle.blocks.length > 0 && pageId) {
            const blocksToInsert = bundle.blocks.map(block => ({
              bundle_id: pageId, // Use pageId as bundle reference
              block_id: block.id,
              block_type: block.type,
              verbatim: block.verbatim,
              html_content: block.html_content,
              markdown_content: block.markdown_content,
              plain_text: block.plain_text,
              // Table specific fields
              table_columns: block.table_columns || null,
              table_rows: block.table_rows || null,
              table_caption: block.table_caption || null,
              // List specific fields
              list_ordered: block.list_ordered || null,
              list_items: block.list_items || null,
              // Heading specific fields
              heading_level: block.heading_level || null,
              heading_text: block.heading_text || null,
              // Source reference fields
              source_ref_kind: block.source_ref.kind,
              source_ref_url: block.source_ref.url,
              source_ref_filename: block.source_ref.filename || null,
              source_ref_page_number: block.source_ref.page_number || null,
              source_ref_selector: block.source_ref.selector || null
            }));
            
            const { error: blocksError } = await supabase.from('content_blocks').insert(blocksToInsert);
            if (blocksError) {
              console.error(`Failed to store content blocks for ${url}:`, blocksError);
              results.errors.push(`Content blocks storage failed for ${url}: ${blocksError.message}`);
            }
          }

          if (bundle.documents.length > 0) {
            const documentsToInsert = bundle.documents.map(doc => ({
              source_url: bundle.source.url,
              filename: doc.name,
              mime: harvester.getMimeTypeFromDocType(doc.doc_type),
              sha256: doc.content_hash || '',
              run_id: runId,
              page_id: pageId,
              size_bytes: null,
              pages: null,
              text_ocr: null
            }));
            const { error: docsError } = await supabase.from('harvested_documents').insert(documentsToInsert);
            if (docsError) {
              console.error(`Failed to store documents for ${url}:`, docsError);
              results.errors.push(`Documents storage failed for ${url}: ${docsError.message}`);
            }
          }

          siteResults.bundles++;
          siteResults.blocks += bundle.blocks.length;
          siteResults.documents += bundle.documents.length;
          siteResults.urls_processed.push(url);

          console.log(`✅ Processed ${url}: ${bundle.blocks.length} blocks, ${bundle.documents.length} docs`);
          await sleep(rate_limit_ms);
        } catch (e) {
          console.error(`❌ Failed to process ${url}:`, e);
          results.errors.push(`Failed to process ${url}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }

      results.sites_processed.push(siteResults);
      results.bundles_created += siteResults.bundles;
      results.blocks_extracted += siteResults.blocks;
      results.documents_found += siteResults.documents;
    }

    await supabase
      .from('pipeline_runs')
      .update({
        status: 'completed',
        stage: 'done',
        ended_at: new Date().toISOString(),
        stats: results
      })
      .eq('id', runId);

    console.log(`🎉 Done: ${results.bundles_created} bundles, ${results.blocks_extracted} blocks, ${results.documents_found} documents`);

    return new Response(JSON.stringify({ success: true, run_id: runId, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error) {
    console.error('❌ Enhanced scraping failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});