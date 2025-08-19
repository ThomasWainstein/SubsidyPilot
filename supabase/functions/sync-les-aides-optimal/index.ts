import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Official API interfaces from documentation
interface LesAidesDispositif {
  numero: number;
  nom: string;
  sigle?: string;
  revision?: number;
  generation?: string;
  validation?: string;
  nouveau?: boolean;
  implantation?: string; // "E", "N", "T"
  uri?: string;
  aps?: boolean;
  domaines?: number[];
  moyens?: number[];
  resume?: string;
}

interface LesAidesResponse {
  idr: number;
  depassement: boolean;
  nb_dispositifs: number;
  date: string;
  dispositifs: LesAidesDispositif[];
  etablissement?: any;
  localisation?: any;
}

interface LesAidesFicheDispositif extends LesAidesDispositif {
  auteur?: string;
  organisme?: {
    numero: number;
    sigle: string;
    raison_sociale: string;
    implantation: string;
    adresses?: Array<{
      libelle: string;
      interlocuteur?: string;
      adresse?: string;
      email?: string;
      service?: string;
      telephone?: string;
      telecopie?: string;
      web?: string;
    }>;
  };
  objet?: string;
  conditions?: string;
  montants?: string;
  conseils?: string;
  references?: string;
  restrictions?: string[];
  criteres?: {
    pour?: Array<{ libelle: string; enfants?: any[] }>;
    contre?: Array<{ libelle: string; enfants?: any[] }>;
  };
}

interface SyncProgress {
  current_approach: string;
  approaches_completed: number;
  total_approaches: number;
  dispositifs_processed: number;
  dispositifs_added: number;
  dispositifs_updated: number;
  errors: number;
  api_requests_made: number;
  eta_minutes: number;
}

class OptimalLesAidesSync {
  private supabase: any;
  private sessionId: string;
  private startTime: number;
  private progress: SyncProgress;
  private apiKey: string;
  private baseApiUrl = 'https://api.les-aides.fr';
  private searchEndpoint = '/aides/';
  private ficheEndpoint = '/aide/';
  private requestLimit = 80; // Conservative limit (720 daily / 9 = 80 per run)

  constructor(supabase: any, apiKey: string) {
    this.supabase = supabase;
    this.apiKey = apiKey;
    this.sessionId = `optimal-les-aides-sync-${Date.now()}`;
    this.startTime = Date.now();
    this.progress = {
      current_approach: '',
      approaches_completed: 0,
      total_approaches: 0,
      dispositifs_processed: 0,
      dispositifs_added: 0,
      dispositifs_updated: 0,
      errors: 0,
      api_requests_made: 0,
      eta_minutes: 0
    };
  }

  private async logProgress() {
    await this.supabase.from('api_sync_logs').upsert({
      api_source: 'les-aides-fr',
      sync_type: 'optimal_sync',
      status: 'running',
      records_processed: this.progress.dispositifs_processed,
      records_added: this.progress.dispositifs_added,
      records_updated: this.progress.dispositifs_updated,
      errors: { error_count: this.progress.errors, api_requests: this.progress.api_requests_made },
      started_at: new Date(this.startTime).toISOString()
    });
  }

  private async verifyApiConnectivity(): Promise<boolean> {
    console.log('🔍 Verifying API connectivity with official endpoint...');
    
    try {
      // Test basic connectivity with minimal parameters
      const testUrl = `${this.baseApiUrl}${this.searchEndpoint}?ape=A&domaine=790&format=json`;
      console.log(`🧪 Testing official endpoint: ${testUrl}`);
      
      const response = await fetch(testUrl, {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-IDC': this.apiKey,
          'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr',
        },
        signal: AbortSignal.timeout(15000)
      });

      console.log(`📊 Connectivity test: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('❌ Authentication failed - IDC key invalid');
        return false;
      }
      
      if (response.status === 403) {
        const errorText = await response.text();
        console.error('❌ API access forbidden:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.log('📋 Error details:', errorData);
        } catch {}
        return false;
      }

      if (response.ok) {
        const data = await response.json() as LesAidesResponse;
        console.log(`✅ API connectivity verified`);
        console.log(`📊 Test search returned ${data.nb_dispositifs} dispositifs`);
        this.progress.api_requests_made++;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Connectivity test failed:', error.message);
      return false;
    }
  }

  private getOptimalSearchApproaches(): Array<{name: string, params: Record<string, string>}> {
    // Strategic approaches based on official documentation
    // Focus on high-value, low-request combinations
    return [
      // Agricultural sector (highest priority for AgriTool)
      { name: 'Agriculture - Création/Reprise', params: { ape: 'A', domaine: '790', format: 'json' } },
      { name: 'Agriculture - Développement', params: { ape: 'A', domaine: '798', format: 'json' } },
      { name: 'Agriculture - Cession/Transmission', params: { ape: 'A', domaine: '793', format: 'json' } },
      { name: 'Agriculture - Investissement', params: { ape: 'A', domaine: '802', format: 'json' } },
      { name: 'Agriculture - Innovation', params: { ape: 'A', domaine: '807', format: 'json' } },
      { name: 'Agriculture - Transition écologique', params: { ape: 'A', domaine: '813', format: 'json' } },
      
      // Specific agricultural APE codes
      { name: 'Cultures - Développement', params: { ape: '01', domaine: '798', format: 'json' } },
      { name: 'Élevage - Investissement', params: { ape: '0141Z', domaine: '802', format: 'json' } },
      { name: 'Volailles - Innovation', params: { ape: '0147Z', domaine: '807', format: 'json' } },
      
      // Business sectors relevant to agriculture
      { name: 'Industrie alimentaire - Développement', params: { ape: 'C', domaine: '798', format: 'json' } },
      { name: 'Commerce agricole - Création', params: { ape: 'G', domaine: '790', format: 'json' } },
      
      // Innovation and digital transformation (high impact)
      { name: 'Agriculture - Numérique', params: { ape: 'A', domaine: '862', format: 'json' } },
      { name: 'Tech agricole - Innovation', params: { ape: 'J', domaine: '807', format: 'json' } },
    ];
  }

  private async searchDispositifs(approach: {name: string, params: Record<string, string>}): Promise<LesAidesResponse | null> {
    if (this.progress.api_requests_made >= this.requestLimit) {
      console.log(`⚠️ Request limit reached (${this.requestLimit})`);
      return null;
    }

    try {
      const searchParams = new URLSearchParams(approach.params);
      const searchUrl = `${this.baseApiUrl}${this.searchEndpoint}?${searchParams.toString()}`;
      
      console.log(`🔍 Searching: ${approach.name}`);
      console.log(`📡 URL: ${searchUrl}`);

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-IDC': this.apiKey,
          'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr',
        },
        signal: AbortSignal.timeout(30000)
      });

      this.progress.api_requests_made++;
      
      if (!response.ok) {
        if (response.status === 403) {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            console.log(`⚠️ Parameter error for ${approach.name}:`, errorData.exception);
          } catch {}
        }
        return null;
      }

      const data = await response.json() as LesAidesResponse;
      console.log(`✅ Found ${data.nb_dispositifs} dispositifs for ${approach.name}`);
      
      if (data.depassement) {
        console.log(`⚠️ Results truncated (>200) for ${approach.name}`);
      }
      
      return data;
    } catch (error) {
      console.error(`❌ Search error for ${approach.name}:`, error.message);
      this.progress.errors++;
      return null;
    }
  }

  private async loadFiche(idr: number, dispositifNumero: number): Promise<LesAidesFicheDispositif | null> {
    if (this.progress.api_requests_made >= this.requestLimit) {
      return null;
    }

    try {
      const ficheParams = new URLSearchParams({
        requete: idr.toString(),
        dispositif: dispositifNumero.toString(),
        format: 'json'
      });
      
      const ficheUrl = `${this.baseApiUrl}${this.ficheEndpoint}?${ficheParams.toString()}`;
      
      const response = await fetch(ficheUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-IDC': this.apiKey,
          'User-Agent': 'AgriTool-Platform/1.0 API les-aides.fr',
        },
        signal: AbortSignal.timeout(30000)
      });

      this.progress.api_requests_made++;
      
      if (!response.ok) {
        return null;
      }

      return await response.json() as LesAidesFicheDispositif;
    } catch (error) {
      this.progress.errors++;
      return null;
    }
  }

  private extractAmounts(montantsHtml?: string): {min: number | null, max: number | null} {
    if (!montantsHtml) return { min: null, max: null };
    
    // Enhanced amount extraction from HTML
    const patterns = [
      /(\d+(?:[\s,]\d{3})*(?:\.\d{2})?)\s*€/g,
      /(\d+(?:[\s,]\d{3})*)\s*euros?/gi,
      /(\d+)%/g // For percentage-based aids
    ];
    
    const amounts: number[] = [];
    
    patterns.forEach(pattern => {
      const matches = [...montantsHtml.matchAll(pattern)];
      matches.forEach(match => {
        const numStr = match[1].replace(/[\s,]/g, '');
        const num = parseInt(numStr);
        if (!isNaN(num) && num > 0) {
          amounts.push(num);
        }
      });
    });
    
    if (amounts.length === 0) return { min: null, max: null };
    
    return {
      min: Math.min(...amounts),
      max: Math.max(...amounts)
    };
  }

  private async processDispositif(dispositif: LesAidesDispositif, fiche: LesAidesFicheDispositif | null, searchContext: any): Promise<void> {
    try {
      const externalId = dispositif.numero.toString();
      
      // Check for existing record
      const { data: existingSubsidy } = await this.supabase
        .from('subsidies')
        .select('id')
        .eq('external_id', externalId)
        .eq('api_source', 'les-aides-fr')
        .maybeSingle();

      // Extract amounts from fiche if available
      const amounts = this.extractAmounts(fiche?.montants);
      
      // Clean HTML from description
      const cleanHtml = (html?: string) => {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      };

      const subsidyData = {
        code: `les-aides-${dispositif.numero}`,
        external_id: externalId,
        api_source: 'les-aides-fr',
        title: dispositif.nom.length > 500 ? dispositif.nom.substring(0, 500) : dispositif.nom,
        description: fiche?.objet ? 
          cleanHtml(fiche.objet).substring(0, 2000) :
          dispositif.resume?.substring(0, 2000) || 'Aide aux entreprises françaises',
        amount_min: amounts.min,
        amount_max: amounts.max,
        currency: 'EUR',
        deadline: null, // Les-Aides.fr doesn't provide standardized deadlines
        eligibility_criteria: {
          domaines: dispositif.domaines || [],
          moyens: dispositif.moyens || [],
          implantation: dispositif.implantation,
          conditions: fiche?.conditions ? cleanHtml(fiche.conditions) : '',
          criteres_pour: fiche?.criteres?.pour || [],
          criteres_contre: fiche?.criteres?.contre || [],
          restrictions: fiche?.restrictions || [],
          organisme: fiche?.organisme?.raison_sociale || ''
        },
        application_url: fiche?.organisme?.adresses?.[0]?.web || dispositif.uri || '',
        status: 'active',
        raw_data: {
          dispositif,
          fiche,
          search_context: searchContext
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingSubsidy) {
        // Update existing
        const { error } = await this.supabase
          .from('subsidies')
          .update({
            title: subsidyData.title,
            description: subsidyData.description,
            amount_min: subsidyData.amount_min,
            amount_max: subsidyData.amount_max,
            eligibility_criteria: subsidyData.eligibility_criteria,
            application_url: subsidyData.application_url,
            raw_data: subsidyData.raw_data,
            updated_at: subsidyData.updated_at
          })
          .eq('id', existingSubsidy.id);

        if (error) {
          throw new Error(`Update failed: ${error.message}`);
        }
        
        this.progress.dispositifs_updated++;
        console.log(`🔄 Updated: ${dispositif.nom.substring(0, 50)}...`);
      } else {
        // Insert new with relations
        const { data: inserted, error } = await this.supabase
          .from('subsidies')
          .insert(subsidyData)
          .select('id')
          .single();

        if (error) {
          throw new Error(`Insert failed: ${error.message}`);
        }
        
        this.progress.dispositifs_added++;
        console.log(`✅ Added: ${dispositif.nom.substring(0, 50)}...`);
        
        // Add relations in parallel
        const relationPromises = [];
        
        // Add location
        relationPromises.push(
          this.supabase.from('subsidy_locations').insert({
            subsidy_id: inserted.id,
            country_code: 'FR',
            region: dispositif.implantation === 'N' ? 'National' : 
                   dispositif.implantation === 'E' ? 'European' : 'Territorial'
          })
        );
        
        // Add categories
        if (dispositif.domaines?.length > 0) {
          const categoryData = dispositif.domaines.map(domainId => ({
            subsidy_id: inserted.id,
            category: `domain-${domainId}`,
            sector: 'agriculture'
          }));
          
          relationPromises.push(
            this.supabase.from('subsidy_categories').insert(categoryData)
          );
        }
        
        await Promise.allSettled(relationPromises);
      }
      
      this.progress.dispositifs_processed++;
    } catch (error) {
      console.error(`❌ Processing error for dispositif ${dispositif.numero}:`, error.message);
      this.progress.errors++;
    }
  }

  private calculateETA(): void {
    const elapsed = Date.now() - this.startTime;
    const remaining = this.progress.total_approaches - this.progress.approaches_completed;
    
    if (this.progress.approaches_completed > 0) {
      const avgTimePerApproach = elapsed / this.progress.approaches_completed;
      this.progress.eta_minutes = Math.round((remaining * avgTimePerApproach) / (1000 * 60));
    }
  }

  async run(): Promise<any> {
    try {
      console.log(`🚀 Optimal Les-Aides.fr sync started (Session: ${this.sessionId})`);
      console.log(`🔑 Using IDC: ${this.apiKey.substring(0, 10)}...${this.apiKey.substring(-10)}`);
      console.log(`📊 Request limit: ${this.requestLimit} (${Math.round(this.requestLimit/72*10)}% of daily quota)`);
      
      // Verify API connectivity
      if (!(await this.verifyApiConnectivity())) {
        throw new Error('API connectivity verification failed');
      }

      const approaches = this.getOptimalSearchApproaches();
      this.progress.total_approaches = approaches.length;
      
      console.log(`🎯 Processing ${approaches.length} strategic search approaches...`);

      // Process each approach
      for (const [index, approach] of approaches.entries()) {
        if (this.progress.api_requests_made >= this.requestLimit) {
          console.log(`⚠️ Stopping early due to request limit`);
          break;
        }
        
        this.progress.current_approach = approach.name;
        console.log(`\n📋 Approach ${index + 1}/${approaches.length}: ${approach.name}`);
        
        const searchResult = await this.searchDispositifs(approach);
        if (!searchResult || searchResult.nb_dispositifs === 0) {
          console.log(`⚠️ No results for ${approach.name}`);
          this.progress.approaches_completed++;
          continue;
        }

        // Process dispositifs with smart batching
        const maxDispositifsPerApproach = Math.min(10, Math.floor((this.requestLimit - this.progress.api_requests_made) / 2));
        const dispositifsToProcess = searchResult.dispositifs.slice(0, maxDispositifsPerApproach);
        
        console.log(`🔄 Processing ${dispositifsToProcess.length}/${searchResult.dispositifs.length} dispositifs...`);
        
        for (const dispositif of dispositifsToProcess) {
          if (this.progress.api_requests_made >= this.requestLimit) break;
          
          // Load detailed fiche
          const fiche = await this.loadFiche(searchResult.idr, dispositif.numero);
          
          // Process dispositif
          await this.processDispositif(dispositif, fiche, {
            approach: approach.name,
            idr: searchResult.idr,
            depassement: searchResult.depassement
          });
          
          // Progress logging every 5 dispositifs
          if (this.progress.dispositifs_processed % 5 === 0) {
            await this.logProgress();
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.progress.approaches_completed++;
        this.calculateETA();
        await this.logProgress();
        
        // Rate limiting between approaches
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Final sync log
      const durationMinutes = Math.round((Date.now() - this.startTime) / (1000 * 60));
      
      await this.supabase.from('api_sync_logs').insert({
        api_source: 'les-aides-fr',
        sync_type: 'optimal_sync',
        status: this.progress.errors === 0 ? 'completed' : 'completed_with_errors',
        records_processed: this.progress.dispositifs_processed,
        records_added: this.progress.dispositifs_added,
        records_updated: this.progress.dispositifs_updated,
        errors: this.progress.errors > 0 ? { 
          error_count: this.progress.errors, 
          api_requests: this.progress.api_requests_made 
        } : null,
        completed_at: new Date().toISOString(),
        started_at: new Date(this.startTime).toISOString()
      });

      return {
        success: true,
        session_id: this.sessionId,
        summary: {
          ...this.progress,
          duration_minutes: durationMinutes,
          api_efficiency: `${this.progress.api_requests_made}/${this.requestLimit} requests (${Math.round(this.progress.api_requests_made/this.requestLimit*100)}%)`,
          working_endpoint: `${this.baseApiUrl}${this.searchEndpoint}`
        },
        message: `✅ Optimal sync completed! Processed ${this.progress.dispositifs_processed} dispositifs (${this.progress.dispositifs_added} added, ${this.progress.dispositifs_updated} updated) using ${this.progress.api_requests_made} API requests.`
      };

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      await this.supabase.from('api_sync_logs').insert({
        api_source: 'les-aides-fr',
        sync_type: 'optimal_sync',
        status: 'failed',
        errors: { error: error.message, stack: error.stack?.substring(0, 1000) },
        completed_at: new Date().toISOString(),
        started_at: new Date(this.startTime).toISOString(),
        records_processed: 0,
        records_added: 0,
        records_updated: 0
      });

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
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY') || '711e55108232352685cca98b49777e6b836bfb79';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const sync = new OptimalLesAidesSync(supabase, lesAidesApiKey);
    const result = await sync.run();

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