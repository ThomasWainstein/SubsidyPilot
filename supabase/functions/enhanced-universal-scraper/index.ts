import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Comprehensive French subsidy URLs for scraping
// Function to get discovered URLs from database instead of hardcoded lists
async function getDiscoveredUrls(site: string, limit: number, supabase: any): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('raw_scraped_pages')
      .select('source_url')
      .eq('source_site', site)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error(`Failed to get URLs for ${site}:`, error);
      return [];
    }
    
    return data?.map(row => row.source_url) || [];
  } catch (err) {
    console.error(`Error fetching URLs for ${site}:`, err);
    return [];
  }
}

interface ScrapeBundle {
  id: string;
  source: {
    kind: 'webpage';
    url: string;
    timestamp: string;
  };
  lang: string;
  content_hash: string;
  last_modified: string;
  blocks: any[];
  documents: any[];
  metadata?: any;
}

class UniversalHarvester {
  private timeout: number = 30000;
  
  async harvestContent(url: string, options: { runId?: string } = {}): Promise<ScrapeBundle> {
    console.log(`🌾 Starting harvest for: ${url}`);
    
    try {
      // Fetch raw content
      const html = await this.fetchRawContent(url);
      
      // Process into structured blocks
      const blocks = await this.processIntoBlocks(html, url);
      
      // Extract linked documents  
      const documents = await this.extractLinkedDocuments(html, url);
      
      // Create bundle
      const bundle: ScrapeBundle = {
        id: crypto.randomUUID(),
        source: {
          kind: 'webpage',
          url: url,
          timestamp: new Date().toISOString()
        },
        lang: await this.detectLanguage(html),
        content_hash: await this.computeContentHash(blocks, documents),
        last_modified: new Date().toISOString(),
        blocks: blocks,
        documents: documents,
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    if (!html || html.length < 100) {
      throw new Error('Empty or too short content received');
    }

    return html;
  }

  private async processIntoBlocks(html: string, sourceUrl: string): Promise<any[]> {
    // Clean HTML and parse with DOMParser equivalent
    const cleanedHtml = this.cleanHtml(html);
    
    // For server-side, we'll use a simple regex-based approach to extract content blocks
    const blocks: any[] = [];
    let blockIndex = 0;

    // Extract headings
    const headingRegex = /<(h[1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    while ((match = headingRegex.exec(cleanedHtml)) !== null) {
      const level = parseInt(match[1].substring(1));
      const text = this.cleanText(match[2]);
      if (text.length > 0) {
        blocks.push({
          id: `block_${blockIndex++}_heading`,
          type: 'heading',
          verbatim: true,
          html_content: match[0],
          plain_text: text,
          heading_level: level,
          heading_text: text,
          source_ref: {
            kind: 'webpage',
            url: sourceUrl,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Extract paragraphs
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
    while ((match = paragraphRegex.exec(cleanedHtml)) !== null) {
      const text = this.cleanText(match[1]);
      if (text.length > 20) { // Only meaningful paragraphs
        blocks.push({
          id: `block_${blockIndex++}_paragraph`,
          type: 'paragraph',
          verbatim: true,
          html_content: match[0],
          plain_text: text,
          source_ref: {
            kind: 'webpage',
            url: sourceUrl,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Extract tables
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gi;
    while ((match = tableRegex.exec(cleanedHtml)) !== null) {
      const tableData = this.extractTableData(match[0]);
      if (tableData.columns.length > 0) {
        blocks.push({
          id: `block_${blockIndex++}_table`,
          type: 'table',
          verbatim: true,
          html_content: match[0],
          plain_text: this.tableToPlainText(tableData),
          table_columns: tableData.columns,
          table_rows: tableData.rows,
          source_ref: {
            kind: 'webpage',
            url: sourceUrl,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Extract lists
    const listRegex = /<(ul|ol)[^>]*>(.*?)<\/(ul|ol)>/gi;
    while ((match = listRegex.exec(cleanedHtml)) !== null) {
      const listData = this.extractListData(match[0], match[1] === 'ol');
      if (listData.items.length > 0) {
        blocks.push({
          id: `block_${blockIndex++}_list`,
          type: 'list',
          verbatim: true,
          html_content: match[0],
          plain_text: listData.items.join('\n'),
          list_ordered: listData.ordered,
          list_items: listData.items,
          source_ref: {
            kind: 'webpage',
            url: sourceUrl,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    return blocks;
  }

  private cleanHtml(html: string): string {
    // Remove script and style elements
    let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove navigation elements
    cleaned = cleaned.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
    cleaned = cleaned.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '');
    cleaned = cleaned.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
    
    return cleaned;
  }

  private cleanText(html: string): string {
    // Remove HTML tags and decode entities
    let text = html.replace(/<[^>]*>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    return text.replace(/\s+/g, ' ').trim();
  }

  private extractTableData(tableHtml: string): { columns: string[], rows: string[][] } {
    const columns: string[] = [];
    const rows: string[][] = [];

    // Extract headers
    const headerRegex = /<th[^>]*>(.*?)<\/th>/gi;
    let match;
    while ((match = headerRegex.exec(tableHtml)) !== null) {
      columns.push(this.cleanText(match[1]));
    }

    // Extract rows
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
    while ((match = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = match[1];
      const cells: string[] = [];
      const cellRegex = /<td[^>]*>(.*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        cells.push(this.cleanText(cellMatch[1]));
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    return { columns, rows };
  }

  private extractListData(listHtml: string, ordered: boolean): { ordered: boolean, items: string[] } {
    const items: string[] = [];
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gi;
    let match;
    while ((match = itemRegex.exec(listHtml)) !== null) {
      const text = this.cleanText(match[1]);
      if (text.length > 0) {
        items.push(text);
      }
    }
    return { ordered, items };
  }

  private tableToPlainText(tableData: { columns: string[], rows: string[][] }): string {
    let text = '';
    if (tableData.columns.length > 0) {
      text += tableData.columns.join(' | ') + '\n';
    }
    for (const row of tableData.rows) {
      text += row.join(' | ') + '\n';
    }
    return text;
  }

  private async extractLinkedDocuments(html: string, baseUrl: string): Promise<any[]> {
    const documents: any[] = [];
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const linkText = this.cleanText(match[2]);
      
      try {
        const absoluteUrl = new URL(href, baseUrl).toString();
        const docType = this.getDocumentType(absoluteUrl);
        
        if (docType && docType !== 'other') {
          documents.push({
            id: crypto.randomUUID(),
            name: linkText || this.extractFilenameFromUrl(absoluteUrl),
            doc_type: docType,
            url: absoluteUrl,
            content_hash: '', // Will be computed after download
            source_ref: {
              kind: 'webpage',
              url: baseUrl,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        // Skip invalid URLs
        continue;
      }
    }

    return documents;
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

  private async detectLanguage(html: string): Promise<string> {
    // Simple French detection
    const text = this.cleanText(html).toLowerCase();
    const frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'ou', 'avec', 'dans', 'pour', 'sur'];
    const frenchCount = frenchWords.reduce((count, word) => 
      count + (text.match(new RegExp(`\\b${word}\\b`, 'g'))?.length || 0), 0
    );
    
    return frenchCount > 10 ? 'fr' : 'en';
  }

  private async computeContentHash(blocks: any[], documents: any[]): Promise<string> {
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

  private getMimeTypeFromDocType(docType: string): string {
    switch (docType) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      default: return 'application/octet-stream';
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sites = ['franceagrimer', 'lesaides'], pages_per_site = 10 } = await req.json();

    console.log(`🚀 Starting enhanced scraping: ${sites.join(', ')} (${pages_per_site} pages each)`);

    // Create new pipeline run
    const runId = crypto.randomUUID();
    const { error: runError } = await supabase
      .from('pipeline_runs')
      .insert({
        id: runId,
        status: 'running',
        stage: 'harvest',
        config: { sites, pages_per_site, scraper: 'universal_harvester' },
        started_at: new Date().toISOString()
      });

    if (runError) {
      throw new Error(`Failed to create pipeline run: ${runError.message}`);
    }

    const harvester = new UniversalHarvester();
    const results = {
      bundles_created: 0,
      blocks_extracted: 0,
      documents_found: 0,
      sites_processed: [],
      errors: []
    };

    // Process each requested site
    for (const site of sites) {
      console.log(`📄 Getting discovered URLs for ${site}...`);
      
      // Get URLs from database (discovered by other harvesters)
      const urls = await getDiscoveredUrls(site, pages_per_site, supabase);
      
      if (urls.length === 0) {
        console.log(`⚠️ No discovered URLs found for ${site}`);
        results.errors.push(`No discovered URLs found for site: ${site}`);
        continue;
      }
      
      console.log(`📄 Processing ${urls.length} discovered URLs for ${site}`);

      let siteResults = {
        site,
        bundles: 0,
        blocks: 0,
        documents: 0,
        urls_processed: []
      };

      for (const url of urls) {
        try {
          // Harvest content
          const bundle = await harvester.harvestContent(url, { runId });
          
          // Store scraped page in existing raw_scraped_pages table (upsert to handle duplicates)
          const { data: pageData, error: pageError } = await supabase
            .from('raw_scraped_pages')
            .upsert({
              source_url: bundle.source.url,
              source_site: bundle.source.url.includes('franceagrimer') ? 'franceagrimer' : 'lesaides',
              raw_text: bundle.blocks.map(b => b.plain_text).join('\n'),
              raw_html: '', // We'll keep this minimal for now
              text_markdown: bundle.blocks.map(b => b.plain_text).join('\n\n'),
              run_id: runId,
              status: 'processed',
              attachment_count: bundle.documents.length,
              scrape_date: new Date().toISOString(),
              sections_jsonb: {
                blocks_count: bundle.blocks.length,
                documents_count: bundle.documents.length,
                content_hash: bundle.content_hash
              }
            }, {
              onConflict: 'source_url'
            })
            .select('id')
            .single();

          if (pageError) {
            console.error(`Failed to store scraped page for ${url}:`, pageError);
            results.errors.push(`Page storage failed for ${url}: ${pageError.message}`);
            // Don't continue - still count the successful harvest even if storage failed/was duplicate
          }

          const pageId = pageData.id;

          // Store harvested documents in existing table
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

            const { error: docsError } = await supabase
              .from('harvested_documents')
              .insert(documentsToInsert);

            if (docsError) {
              console.error(`Failed to store documents for ${url}:`, docsError);
              results.errors.push(`Documents storage failed for ${url}: ${docsError.message}`);
            }
          }

          // Update results
          siteResults.bundles++;
          siteResults.blocks += bundle.blocks.length;
          siteResults.documents += bundle.documents.length;
          siteResults.urls_processed.push(url);

          console.log(`✅ Processed ${url}: ${bundle.blocks.length} blocks, ${bundle.documents.length} docs`);

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Failed to process ${url}:`, error);
          results.errors.push(`Failed to process ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      results.sites_processed.push(siteResults);
      results.bundles_created += siteResults.bundles;
      results.blocks_extracted += siteResults.blocks;
      results.documents_found += siteResults.documents;
    }

    // Update pipeline run status
    await supabase
      .from('pipeline_runs')
      .update({
        status: 'completed',
        stage: 'done',
        ended_at: new Date().toISOString(),
        stats: results
      })
      .eq('id', runId);

    console.log(`🎉 Scraping completed: ${results.bundles_created} bundles, ${results.blocks_extracted} blocks, ${results.documents_found} documents`);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Enhanced scraping failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});