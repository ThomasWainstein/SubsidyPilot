import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LesAidesSubsidy {
  id?: string;
  titre?: string;
  nom?: string;
  title?: string;
  description?: string;
  montant_min?: number;
  montant_max?: number;
  date_limite?: string;
  url_candidature?: string;
  url?: string;
  secteurs?: string[];
  beneficiaires?: string[];
  conditions?: string;
  zones_geo?: string[];
  [key: string]: any;
}

interface LesAidesResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: LesAidesSubsidy[];
  data?: LesAidesSubsidy[];
  [key: string]: any;
}

interface SyncProgress {
  pages_completed: number;
  subsidies_processed: number;
  subsidies_added: number;
  subsidies_updated: number;
  errors: number;
  current_page: number;
  total_pages: number;
  eta_minutes: number;
}

class LesAidesSync {
  private supabase: any;
  private sessionId: string;
  private startTime: number;
  private progress: SyncProgress;
  private apiKey: string;
  private workingEndpoint: string = '';
  private workingAuth: Record<string, string> = {};

  constructor(supabase: any, apiKey: string) {
    this.supabase = supabase;
    this.apiKey = apiKey;
    this.sessionId = `les-aides-sync-${Date.now()}`;
    this.startTime = Date.now();
    this.progress = {
      pages_completed: 0,
      subsidies_processed: 0,
      subsidies_added: 0,
      subsidies_updated: 0,
      errors: 0,
      current_page: 0,
      total_pages: 0,
      eta_minutes: 0
    };
  }

  private async logProgress() {
    await this.supabase.from('api_sync_logs').upsert({
      api_source: 'les-aides-fr',
      sync_type: 'enhanced_sync',
      status: 'running',
      session_id: this.sessionId,
      records_processed: this.progress.subsidies_processed,
      records_added: this.progress.subsidies_added,
      records_updated: this.progress.subsidies_updated,
      errors: { error_count: this.progress.errors },
      progress_data: this.progress,
      started_at: new Date(this.startTime).toISOString()
    }, { onConflict: 'session_id' });
  }

  private async discoverWorkingEndpoint(): Promise<boolean> {
    console.log('🔍 Discovering working API endpoint...');
    
    const baseUrls = [
      'https://api.les-aides.fr/',
      'https://les-aides.fr/api/',
      'https://www.les-aides.fr/api/'
    ];
    
    const endpointPatterns = ['aides', 'dispositifs', 'aids', 'v1/aids'];
    const authMethods = [
      { 'Authorization': `Bearer ${this.apiKey}` },
      { 'X-API-Key': this.apiKey },
      { 'IDC': this.apiKey },
      { 'api-key': this.apiKey },
      {}
    ];

    for (const baseUrl of baseUrls) {
      for (const pattern of endpointPatterns) {
        for (const authHeaders of authMethods) {
          try {
            const testUrl = `${baseUrl}${pattern}?page=1&page_size=1`;
            console.log(`🧪 Testing: ${testUrl}`);
            
            const response = await fetch(testUrl, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'AgriTool-Platform/1.0',
                ...authHeaders
              },
              signal: AbortSignal.timeout(10000) // 10 second timeout
            });

            if (response.ok) {
              const data = await response.json() as LesAidesResponse;
              const subsidies = data.results || data.data || [];
              
              if (subsidies.length > 0 || (data.count !== undefined && data.count >= 0)) {
                this.workingEndpoint = `${baseUrl}${pattern}`;
                this.workingAuth = authHeaders;
                console.log(`✅ Found working endpoint: ${this.workingEndpoint}`);
                console.log(`🔑 Using auth:`, Object.keys(authHeaders));
                return true;
              }
            }
          } catch (error) {
            console.log(`❌ Failed ${baseUrl}${pattern}:`, error.message);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
        }
      }
    }
    
    return false;
  }

  private async fetchPage(pageNumber: number, pageSize: number = 50): Promise<LesAidesResponse | null> {
    try {
      const url = `${this.workingEndpoint}?page=${pageNumber}&page_size=${pageSize}`;
      console.log(`📄 Fetching page ${pageNumber}: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AgriTool-Platform/1.0',
          ...this.workingAuth
        },
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as LesAidesResponse;
    } catch (error) {
      console.error(`❌ Error fetching page ${pageNumber}:`, error.message);
      return null;
    }
  }

  private async processSubsidyBatch(subsidies: LesAidesSubsidy[]): Promise<void> {
    console.log(`🔄 Processing batch of ${subsidies.length} subsidies...`);
    
    for (const [index, subsidy] of subsidies.entries()) {
      try {
        await this.processSubsidy(subsidy, index);
        this.progress.subsidies_processed++;
        
        // Update progress every 10 subsidies
        if (this.progress.subsidies_processed % 10 === 0) {
          await this.logProgress();
        }
      } catch (error) {
        console.error(`❌ Error processing subsidy ${index}:`, error.message);
        this.progress.errors++;
      }
    }
  }

  private async processSubsidy(subsidy: LesAidesSubsidy, index: number): Promise<void> {
    const title = subsidy.titre || subsidy.nom || subsidy.title || `Aide ${subsidy.id || index + 1}`;
    const externalId = subsidy.id?.toString() || `les-aides-${Date.now()}-${index}`;
    
    // Check for existing subsidy using maybeSingle()
    const { data: existingSubsidy, error: selectError } = await this.supabase
      .from('subsidies')
      .select('id')
      .eq('external_id', externalId)
      .eq('api_source', 'les-aides-fr')
      .maybeSingle();

    if (selectError) {
      throw new Error(`Database select error: ${selectError.message}`);
    }

    // Prepare subsidy data with validation
    const subsidyData = {
      code: `les-aides-${externalId}`,
      external_id: externalId,
      api_source: 'les-aides-fr',
      title: this.validateString(title, 500),
      description: this.validateString(subsidy.description || 'Aide aux entreprises françaises', 2000),
      amount_min: this.validateNumber(subsidy.montant_min),
      amount_max: this.validateNumber(subsidy.montant_max),
      currency: 'EUR',
      deadline: this.validateDate(subsidy.date_limite),
      eligibility_criteria: {
        secteurs: subsidy.secteurs || [],
        beneficiaires: subsidy.beneficiaires || [],
        conditions: subsidy.conditions || '',
        zones_geo: subsidy.zones_geo || []
      },
      application_url: this.validateUrl(subsidy.url_candidature || subsidy.url || ''),
      status: 'active',
      raw_data: subsidy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingSubsidy) {
      // Update existing record
      const { error: updateError } = await this.supabase
        .from('subsidies')
        .update({
          title: subsidyData.title,
          description: subsidyData.description,
          amount_min: subsidyData.amount_min,
          amount_max: subsidyData.amount_max,
          deadline: subsidyData.deadline,
          eligibility_criteria: subsidyData.eligibility_criteria,
          application_url: subsidyData.application_url,
          raw_data: subsidyData.raw_data,
          updated_at: subsidyData.updated_at
        })
        .eq('id', existingSubsidy.id);

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`);
      }
      
      this.progress.subsidies_updated++;
      console.log(`🔄 Updated: ${title}`);
    } else {
      // Insert new record with related data
      await this.insertSubsidyWithRelations(subsidyData, subsidy);
      this.progress.subsidies_added++;
      console.log(`✅ Added: ${title}`);
    }
  }

  private async insertSubsidyWithRelations(subsidyData: any, originalSubsidy: LesAidesSubsidy): Promise<void> {
    // Insert main subsidy
    const { data: insertedSubsidy, error: insertError } = await this.supabase
      .from('subsidies')
      .insert(subsidyData)
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Duplicate key
        console.log(`⚠️ Duplicate subsidy found, attempting update...`);
        const { error: updateError } = await this.supabase
          .from('subsidies')
          .update(subsidyData)
          .eq('external_id', subsidyData.external_id)
          .eq('api_source', 'les-aides-fr');
        
        if (updateError) {
          throw new Error(`Duplicate update failed: ${updateError.message}`);
        }
        
        this.progress.subsidies_updated++;
        return;
      }
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    // Insert related data in parallel
    const relationPromises = [];

    if (originalSubsidy.zones_geo?.length > 0) {
      const locationData = originalSubsidy.zones_geo.map(zone => ({
        subsidy_id: insertedSubsidy.id,
        country_code: 'FR',
        region: zone
      }));
      
      relationPromises.push(
        this.supabase.from('subsidy_locations').insert(locationData)
      );
    }

    if (originalSubsidy.secteurs?.length > 0) {
      const categoryData = originalSubsidy.secteurs.map(secteur => ({
        subsidy_id: insertedSubsidy.id,
        category: secteur,
        sector: 'business'
      }));
      
      relationPromises.push(
        this.supabase.from('subsidy_categories').insert(categoryData)
      );
    }

    if (relationPromises.length > 0) {
      const results = await Promise.allSettled(relationPromises);
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`⚠️ Relation insert ${index} failed:`, result.reason);
        }
      });
    }
  }

  // Validation helpers
  private validateString(value: string | undefined, maxLength: number): string {
    if (!value) return '';
    return value.length > maxLength ? value.substring(0, maxLength) : value;
  }

  private validateNumber(value: number | undefined): number | null {
    if (value === undefined || value === null || isNaN(value)) return null;
    return Math.max(0, value);
  }

  private validateDate(dateString: string | undefined): string | null {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date.toISOString();
    } catch {
      return null;
    }
  }

  private validateUrl(url: string): string {
    if (!url) return '';
    try {
      new URL(url);
      return url;
    } catch {
      return url.startsWith('http') ? url : `https://${url}`;
    }
  }

  private calculateETA(): void {
    const elapsed = Date.now() - this.startTime;
    const processed = this.progress.subsidies_processed;
    const remaining = (this.progress.total_pages * 50) - processed; // Estimate
    
    if (processed > 0) {
      const avgTimePerSubsidy = elapsed / processed;
      this.progress.eta_minutes = Math.round((remaining * avgTimePerSubsidy) / (1000 * 60));
    }
  }

  async run(maxPages: number = 20): Promise<any> {
    try {
      console.log(`🚀 Enhanced Les-Aides.fr sync started (Session: ${this.sessionId})`);
      
      // Discover working endpoint
      if (!(await this.discoverWorkingEndpoint())) {
        throw new Error('No working API endpoint found');
      }

      // Get first page to determine total pages
      const firstPage = await this.fetchPage(1);
      if (!firstPage) {
        throw new Error('Failed to fetch first page');
      }

      const totalCount = firstPage.count || 0;
      const pageSize = 50;
      this.progress.total_pages = Math.min(Math.ceil(totalCount / pageSize), maxPages);
      
      console.log(`📊 Found ${totalCount} total subsidies across ${this.progress.total_pages} pages`);

      // Process pages with rate limiting
      for (let pageNum = 1; pageNum <= this.progress.total_pages; pageNum++) {
        console.log(`📄 Processing page ${pageNum}/${this.progress.total_pages}...`);
        this.progress.current_page = pageNum;
        
        const pageData = pageNum === 1 ? firstPage : await this.fetchPage(pageNum);
        if (!pageData) {
          console.warn(`⚠️ Skipping page ${pageNum} due to fetch error`);
          continue;
        }

        const subsidies = pageData.results || pageData.data || [];
        if (subsidies.length > 0) {
          await this.processSubsidyBatch(subsidies);
        }

        this.progress.pages_completed = pageNum;
        this.calculateETA();
        await this.logProgress();

        // Rate limiting between pages
        if (pageNum < this.progress.total_pages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Final sync log
      const durationMinutes = Math.round((Date.now() - this.startTime) / (1000 * 60));
      
      await this.supabase.from('api_sync_logs').upsert({
        api_source: 'les-aides-fr',
        sync_type: 'enhanced_sync',
        status: this.progress.errors === 0 ? 'completed' : 'completed_with_errors',
        session_id: this.sessionId,
        records_processed: this.progress.subsidies_processed,
        records_added: this.progress.subsidies_added,
        records_updated: this.progress.subsidies_updated,
        errors: this.progress.errors > 0 ? { error_count: this.progress.errors } : null,
        completed_at: new Date().toISOString(),
        progress_data: { ...this.progress, duration_minutes: durationMinutes }
      }, { onConflict: 'session_id' });

      return {
        success: true,
        session_id: this.sessionId,
        summary: {
          ...this.progress,
          duration_minutes: durationMinutes,
          working_endpoint: this.workingEndpoint
        },
        message: `✅ Enhanced sync completed! Processed ${this.progress.subsidies_processed} subsidies (${this.progress.subsidies_added} added, ${this.progress.subsidies_updated} updated) with ${this.progress.errors} errors.`
      };

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      // Log failure
      await this.supabase.from('api_sync_logs').upsert({
        api_source: 'les-aides-fr',
        sync_type: 'enhanced_sync',
        status: 'failed',
        session_id: this.sessionId,
        errors: { error: error.message, stack: error.stack?.substring(0, 1000) },
        completed_at: new Date().toISOString()
      }, { onConflict: 'session_id' });

      throw error;
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY');

    if (!supabaseUrl || !supabaseKey || !lesAidesApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request parameters
    const url = new URL(req.url);
    const maxPages = parseInt(url.searchParams.get('max_pages') || '20');
    
    const sync = new LesAidesSync(supabase, lesAidesApiKey);
    const result = await sync.run(maxPages);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Request handler error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: error.stack?.substring(0, 1000) || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});